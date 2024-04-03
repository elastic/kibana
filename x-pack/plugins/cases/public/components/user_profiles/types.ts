/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { UserWithProfileInfo } from '../../../common/types/domain';

export interface Assignee {
  uid: string;
  profile?: UserProfileWithAvatar;
}

export interface AssigneeWithProfile extends Assignee {
  profile: UserProfileWithAvatar;
}

export type UserInfoWithAvatar = Partial<Pick<UserProfileWithAvatar, 'user' | 'data'>>;
export type AssigneesFilteringSelection = UserProfileWithAvatar | null;
export type CaseUserWithProfileInfo = UserWithProfileInfo;
