/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import { UsersDetailsNavTab } from './types';
import { UsersTableType } from '../../store/model';
import { USERS_PATH } from '../../../../common/constants';

const getTabsOnUsersDetailsUrl = (hostName: string, tabName: UsersTableType) =>
  `${USERS_PATH}/${hostName}/${tabName}`;

export const navTabsUsersDetails = (hostName: string): UsersDetailsNavTab => {
  return {
    [UsersTableType.allUsers]: {
      id: UsersTableType.allUsers,
      name: i18n.ALL_USERS_TITLE,
      href: getTabsOnUsersDetailsUrl(hostName, UsersTableType.allUsers),
      disabled: false,
    },
  };
};
