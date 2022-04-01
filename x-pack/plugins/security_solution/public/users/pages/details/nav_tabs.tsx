/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from '../translations';
import { UsersDetailsNavTab } from './types';
import { UsersTableType } from '../../store/model';
import { USERS_PATH } from '../../../../common/constants';

const getTabsOnUsersDetailsUrl = (userName: string, tabName: UsersTableType) =>
  `${USERS_PATH}/${userName}/${tabName}`;

export const navTabsUsersDetails = (
  userName: string,
  hasMlUserPermissions: boolean
): UsersDetailsNavTab => {
  const userDetailsNavTabs = {
    [UsersTableType.anomalies]: {
      id: UsersTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.anomalies),
      disabled: false,
    },
    [UsersTableType.events]: {
      id: UsersTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.events),
      disabled: false,
    },
    [UsersTableType.alerts]: {
      id: UsersTableType.alerts,
      name: i18n.NAVIGATION_ALERTS_TITLE,
      href: getTabsOnUsersDetailsUrl(userName, UsersTableType.alerts),
      disabled: false,
    },
  };

  return hasMlUserPermissions
    ? userDetailsNavTabs
    : omit([UsersTableType.anomalies], userDetailsNavTabs);
};
