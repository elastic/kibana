/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfileUserInfo } from '@kbn/user-profile-components/target_types/user_profile';
import { isEmpty } from 'lodash';
import * as i18n from './translations';

export const getName = (user?: UserProfileUserInfo): string => {
  if (!user) {
    return i18n.UNKNOWN;
  }

  return (
    getIfNotEmpty(user.full_name) ??
    getIfNotEmpty(user.email) ??
    getIfNotEmpty(user.username) ??
    i18n.UNKNOWN
  );
};

const getIfNotEmpty = (field?: string) => {
  if (isEmpty(field)) {
    return;
  }

  return field;
};
