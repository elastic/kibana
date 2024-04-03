/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { IBasePath, Logger } from '@kbn/core/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfileUserInfo } from '@kbn/user-profile-components';
import { CASE_SAVED_OBJECT, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { getCaseViewPath } from '../../common/utils';
import type { NotificationService, NotifyAssigneesArgs } from './types';
import { assigneesTemplateRenderer } from './templates/assignees/renderer';

type WithRequiredProperty<T, K extends keyof T> = T & Required<Pick<T, K>>;

type UserProfileUserInfoWithEmail = WithRequiredProperty<UserProfileUserInfo, 'email'>;

export class EmailNotificationService implements NotificationService {
  private readonly logger: Logger;
  private readonly notifications: NotificationsPluginStart;
  private readonly security: SecurityPluginStart;
  private readonly spaceId: string;
  private readonly publicBaseUrl?: IBasePath['publicBaseUrl'];

  constructor({
    logger,
    notifications,
    security,
    publicBaseUrl,
    spaceId,
  }: {
    logger: Logger;
    notifications: NotificationsPluginStart;
    security: SecurityPluginStart;
    spaceId: string;
    publicBaseUrl?: IBasePath['publicBaseUrl'];
  }) {
    this.logger = logger;
    this.notifications = notifications;
    this.security = security;
    this.spaceId = spaceId;
    this.publicBaseUrl = publicBaseUrl;
  }

  private static getCaseUrl(
    theCase: CaseSavedObjectTransformed,
    spaceId: string,
    publicBaseUrl?: IBasePath['publicBaseUrl']
  ) {
    return publicBaseUrl
      ? getCaseViewPath({
          publicBaseUrl,
          caseId: theCase.id,
          owner: theCase.attributes.owner,
          spaceId,
        })
      : null;
  }

  private static getTitle(theCase: CaseSavedObjectTransformed) {
    return `[Elastic][Cases] ${theCase.attributes.title}`;
  }

  private static getPlainTextMessage(theCase: CaseSavedObjectTransformed, caseUrl: string | null) {
    const lineBreak = '\r\n\r\n';
    let message = `You are assigned to an Elastic Case.${lineBreak}`;
    message = `${message}Title: ${theCase.attributes.title}${lineBreak}`;
    message = `${message}Status: ${theCase.attributes.status}${lineBreak}`;
    message = `${message}Severity: ${theCase.attributes.severity}${lineBreak}`;

    if (theCase.attributes.tags.length > 0) {
      message = `${message}Tags: ${theCase.attributes.tags.join(', ')}${lineBreak}`;
    }

    message = caseUrl ? `${message}${lineBreak}View the case details: ${caseUrl}` : message;

    return message;
  }

  private static async getHTMLMessage(theCase: CaseSavedObjectTransformed, caseUrl: string | null) {
    return assigneesTemplateRenderer(theCase, caseUrl);
  }

  public async notifyAssignees({ assignees, theCase }: NotifyAssigneesArgs) {
    try {
      if (!this.notifications.isEmailServiceAvailable()) {
        this.logger.warn('Could not notifying assignees. Email service is not available.');
        return;
      }

      const caseUrl = EmailNotificationService.getCaseUrl(
        theCase,
        this.spaceId,
        this.publicBaseUrl
      );

      const uids = new Set(assignees.map((assignee) => assignee.uid));
      const userProfiles = await this.security.userProfiles.bulkGet({ uids });
      const users = userProfiles.map((profile) => profile.user);

      const to = users
        .filter((user): user is UserProfileUserInfoWithEmail => user.email != null)
        .map((user) => user.email);

      const subject = EmailNotificationService.getTitle(theCase);
      const message = EmailNotificationService.getPlainTextMessage(theCase, caseUrl);

      const messageHTML = await EmailNotificationService.getHTMLMessage(theCase, caseUrl);

      await this.notifications.getEmailService().sendHTMLEmail({
        to,
        subject,
        message,
        messageHTML,
        context: {
          relatedObjects: [
            {
              id: theCase.id,
              type: CASE_SAVED_OBJECT,
              /**
               * Cases are not shareable at the moment from the UI
               * The namespaces should be either undefined or contain
               * only one item, the space the case got created. If we decide
               * in the future to share cases in multiple spaces we need
               * to change the logic.
               */
              namespace: theCase.namespaces?.[0],
            },
          ],
        },
      });
    } catch (error) {
      this.logger.warn(`Error notifying assignees: ${error.message}`);
    }
  }

  public async bulkNotifyAssignees(casesAndAssigneesToNotifyForAssignment: NotifyAssigneesArgs[]) {
    if (casesAndAssigneesToNotifyForAssignment.length === 0) {
      return;
    }

    await pMap(
      casesAndAssigneesToNotifyForAssignment,
      (args: NotifyAssigneesArgs) => this.notifyAssignees(args),
      {
        concurrency: MAX_CONCURRENT_SEARCHES,
      }
    );
  }
}
