/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { UserProfileUserInfo } from '@kbn/user-profile-components';
import type { CaseResponse } from '../../common/api';

type WithRequiredProperty<T, K extends keyof T> = T & Required<Pick<T, K>>;

type UserProfileUserInfoWithEmail = WithRequiredProperty<UserProfileUserInfo, 'email'>;

interface NotifyArgs {
  users: UserProfileUserInfo[];
  theCase: CaseResponse;
}

export class NotificationsService {
  constructor(private readonly notifications: NotificationsPluginStart) {}

  private getTitle(theCase: CaseResponse) {
    // TODO: Better title
    return `You got assigned to case "${theCase.title}"`;
  }

  private getMessage(theCase: CaseResponse) {
    // TODO: Add backlink to case
    return `You got assigned to case "${theCase.title}"`;
  }

  public async notify({ users, theCase }: NotifyArgs) {
    const to = users
      .filter((user): user is UserProfileUserInfoWithEmail => user.email != null)
      .map((user) => user.email);

    const subject = this.getTitle(theCase);
    const message = this.getMessage(theCase);

    // TODO: Check if it sends one email per user
    // TODO: add SenderContext to pass cases SO ids as references.
    // TODO: Silent errors & log
    // TODO: Should we log-warn for users without email?
    await this.notifications.email?.sendPlainTextEmail({ to, subject, message });
  }

  public async bulkNotify(args: NotifyArgs[]) {
    await Promise.all(args.map(({ users, theCase }) => this.notify({ users, theCase })));
  }
}
