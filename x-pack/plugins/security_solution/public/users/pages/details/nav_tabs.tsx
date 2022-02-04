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
    [UsersTableType.riskScore]: {
      id: UsersTableType.riskScore,
      name: i18n.RISK_SCORE_TITLE,
      href: getTabsOnUsersDetailsUrl(hostName, UsersTableType.riskScore),
      disabled: false,
    },
    // [UsersTableType.hostTactics]: {
    //   id: UsersTableType.hostTactics,
    //   name: i18n.HOST_TACTICS,
    //   href: getTabsOnUsersDetailsUrl(hostName, UsersTableType.hostTactics),
    //   disabled: false,
    // },
    // [UsersTableType.userRules]: {
    //   id: UsersTableType.userRules,
    //   name: i18n.USER_RULES,
    //   href: getTabsOnUsersDetailsUrl(hostName, UsersTableType.userRules),
    //   disabled: false,
    // },
  };
};
