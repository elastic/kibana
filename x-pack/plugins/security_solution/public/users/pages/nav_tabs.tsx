/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import { UsersTableType } from '../store/model';
import { UsersNavTab } from './navigation/types';
import { USERS_PATH } from '../../../common/constants';

const getTabsOnUsersUrl = (tabName: UsersTableType) => `${USERS_PATH}/${tabName}`;

export const navTabsUsers: UsersNavTab = {
  [UsersTableType.allUsers]: {
    id: UsersTableType.allUsers,
    name: i18n.NAVIGATION_ALL_USERS_TITLE,
    href: getTabsOnUsersUrl(UsersTableType.allUsers),
    disabled: false,
  },
  [UsersTableType.anomalies]: {
    id: UsersTableType.anomalies,
    name: i18n.NAVIGATION_ANOMALIES_TITLE,
    href: getTabsOnUsersUrl(UsersTableType.anomalies),
    disabled: false,
  },
  [UsersTableType.risk]: {
    id: UsersTableType.risk,
    name: i18n.NAVIGATION_RISK_TITLE,
    href: getTabsOnUsersUrl(UsersTableType.risk),
    disabled: false,
  },
};
