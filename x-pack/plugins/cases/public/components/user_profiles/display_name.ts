/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfileUserInfo } from '@kbn/user-profile-components/target_types/user_profile';
import * as i18n from '../../common/translations';

export const getName = (user?: UserProfileUserInfo): string => {
  if (!user) {
    return i18n.UNKNOWN;
  }

  return user.display_name ?? user.full_name ?? user.email ?? user.username;
};
