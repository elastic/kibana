/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath, Logger } from '@kbn/core/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { namespaceToSpaceId } from '@kbn/spaces-plugin/server/lib/utils/namespace';
import type { UserProfileUserInfo } from '@kbn/user-profile-components';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CaseSavedObject } from '../../common/types';
import { getCaseViewPath } from '../../common/utils';
import type { NotificationService, NotifyArgs } from './types';

type WithRequiredProperty<T, K extends keyof T> = T & Required<Pick<T, K>>;

type UserProfileUserInfoWithEmail = WithRequiredProperty<UserProfileUserInfo, 'email'>;

export class EmailNotificationService implements NotificationService {
  private readonly logger: Logger;
  private readonly notifications: NotificationsPluginStart;
  private readonly security: SecurityPluginStart;
  private readonly publicBaseUrl?: IBasePath['publicBaseUrl'];

  constructor({
    logger,
    notifications,
    security,
    publicBaseUrl,
  }: {
    logger: Logger;
    notifications: NotificationsPluginStart;
    security: SecurityPluginStart;
    publicBaseUrl?: IBasePath['publicBaseUrl'];
  }) {
    this.logger = logger;
    this.notifications = notifications;
    this.security = security;
    this.publicBaseUrl = publicBaseUrl;
  }

  private getTitle(theCase: CaseSavedObject) {
    // TODO: Better title
    return `You got assigned to case "${theCase.attributes.title}"`;
  }

  private getMessage(theCase: CaseSavedObject) {
    let message = `You got assigned to case "${theCase.attributes.title}"`;

    if (this.publicBaseUrl) {
      const caseUrl = getCaseViewPath({
        publicBaseUrl: this.publicBaseUrl,
        caseId: theCase.id,
        owner: theCase.attributes.owner,
      });

      message = `${message}. [View case](${caseUrl}).`;
    }

    return message;
  }

  public async notifyAssignees({ assignees, theCase }: NotifyArgs) {
    if (!this.notifications.isEmailServiceAvailable()) {
      this.logger.warn('Could not notifying assignees. Email service is not available.');
      return;
    }

    try {
      const uids = new Set(assignees.map((assignee) => assignee.uid));
      const userProfiles = await this.security.userProfiles.bulkGet({ uids });
      const users = userProfiles.map((profile) => profile.user);

      const to = users
        .filter((user): user is UserProfileUserInfoWithEmail => user.email != null)
        .map((user) => user.email);

      const subject = this.getTitle(theCase);
      const message = this.getMessage(theCase);

      await this.notifications.getEmailService().sendPlainTextEmail({
        to,
        subject,
        message,
        context: {
          relatedObjects: [
            {
              id: theCase.id,
              type: CASE_SAVED_OBJECT,
              // FIX: Should the spaceId be ["default"] if namespaces are undefined?
              spaceIds: theCase.namespaces?.map(namespaceToSpaceId) ?? [],
            },
          ],
        },
      });
    } catch (error) {
      this.logger.warn(`Error notifying assignees: ${error.message}`);
    }
  }

  public async bulkNotifyAssignees(args: NotifyArgs[]) {
    await Promise.all(
      args.map(({ assignees, theCase }) => this.notifyAssignees({ assignees, theCase }))
    );
  }
}
