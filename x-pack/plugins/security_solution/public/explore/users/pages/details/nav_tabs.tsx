/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from '../translations';
import type { UsersDetailsNavTab } from './types';
import { UsersTableType } from '../../store/model';
import { USERS_PATH } from '../../../../../common/constants';

const getTabsOnUsersDetailsUrl = (userName: string, tabName: UsersTableType) =>
  `${USERS_PATH}/name/${userName}/${tabName}`;

export const navTabsUsersDetails = (
  userName: string,
  hasMlUserPermissions: boolean,
  isRiskyUserEnabled: boolean
): UsersDetailsNavTab => {
  const hiddenTabs = [];

  const userDetailsNavTabs = {
    [UsersTableType.events]: {
      id: UsersTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.events),
      disabled: false,
    },
    [UsersTableType.authentications]: {
      id: UsersTableType.authentications,
      name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.authentications),
      disabled: false,
    },
    [UsersTableType.anomalies]: {
      id: UsersTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.anomalies),
      disabled: false,
    },
    [UsersTableType.risk]: {
      id: UsersTableType.risk,
      name: i18n.NAVIGATION_RISK_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.risk),
      disabled: false,
    },
  };

  if (!hasMlUserPermissions) {
    hiddenTabs.push(UsersTableType.anomalies);
  }

  if (!isRiskyUserEnabled) {
    hiddenTabs.push(UsersTableType.risk);
  }

  return omit(hiddenTabs, userDetailsNavTabs);
};
