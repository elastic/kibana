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
import type { CaseSavedObject } from '../../common/types';
import { getCaseViewPath } from '../../common/utils';
import type { NotificationService, NotifyArgs } from './types';

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

  private static getTitle(theCase: CaseSavedObject) {
    return `[Elastic][Cases] ${theCase.attributes.title}`;
  }

  private static getMessage(
    theCase: CaseSavedObject,
    spaceId: string,
    publicBaseUrl?: IBasePath['publicBaseUrl']
  ) {
    const lineBreak = '\r\n\r\n';
    let message = `You are assigned to an Elastic Case.${lineBreak}`;
    message = `${message}Title: ${theCase.attributes.title}${lineBreak}`;
    message = `${message}Status: ${theCase.attributes.status}${lineBreak}`;
    message = `${message}Severity: ${theCase.attributes.severity}${lineBreak}`;

    if (theCase.attributes.tags.length > 0) {
      message = `${message}Tags: ${theCase.attributes.tags.join(', ')}${lineBreak}`;
    }

    if (publicBaseUrl) {
      const caseUrl = getCaseViewPath({
        publicBaseUrl,
        caseId: theCase.id,
        owner: theCase.attributes.owner,
        spaceId,
      });

      message = `${message}${lineBreak}[View the case details](${caseUrl})`;
    }

    return message;
  }

  public async notifyAssignees({ assignees, theCase }: NotifyArgs) {
    try {
      if (!this.notifications.isEmailServiceAvailable()) {
        this.logger.warn('Could not notifying assignees. Email service is not available.');
        return;
      }

      const uids = new Set(assignees.map((assignee) => assignee.uid));
      const userProfiles = await this.security.userProfiles.bulkGet({ uids });
      const users = userProfiles.map((profile) => profile.user);

      const to = users
        .filter((user): user is UserProfileUserInfoWithEmail => user.email != null)
        .map((user) => user.email);

      const subject = EmailNotificationService.getTitle(theCase);
      const message = EmailNotificationService.getMessage(
        theCase,
        this.spaceId,
        this.publicBaseUrl
      );

      await this.notifications.getEmailService().sendPlainTextEmail({
        to,
        subject,
        message,
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

  public async bulkNotifyAssignees(casesAndAssigneesToNotifyForAssignment: NotifyArgs[]) {
    if (casesAndAssigneesToNotifyForAssignment.length === 0) {
      return;
    }

    await pMap(
      casesAndAssigneesToNotifyForAssignment,
      (args: NotifyArgs) => this.notifyAssignees(args),
      {
        concurrency: MAX_CONCURRENT_SEARCHES,
      }
    );
  }
}
