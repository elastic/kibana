/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from './translations';
import { UsersTableType } from '../store/model';
import type { UsersNavTab } from './navigation/types';
import { USERS_PATH } from '../../../../common/constants';
import { TECHNICAL_PREVIEW } from '../../../overview/pages/translations';

const getTabsOnUsersUrl = (tabName: UsersTableType) => `${USERS_PATH}/${tabName}`;

export const navTabsUsers = (
  hasMlUserPermissions: boolean,
  isRiskyUserEnabled: boolean
): UsersNavTab => {
  const hiddenTabs = [];

  const userNavTabs = {
    [UsersTableType.allUsers]: {
      id: UsersTableType.allUsers,
      name: i18n.NAVIGATION_ALL_USERS_TITLE,
      href: getTabsOnUsersUrl(UsersTableType.allUsers),
      disabled: false,
    },
    [UsersTableType.authentications]: {
      id: UsersTableType.authentications,
      name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
      href: getTabsOnUsersUrl(UsersTableType.authentications),
      disabled: false,
    },
    [UsersTableType.anomalies]: {
      id: UsersTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnUsersUrl(UsersTableType.anomalies),
      disabled: false,
    },
    [UsersTableType.events]: {
      id: UsersTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnUsersUrl(UsersTableType.events),
      disabled: false,
    },
    [UsersTableType.risk]: {
      id: UsersTableType.risk,
      name: i18n.NAVIGATION_RISK_TITLE,
      href: getTabsOnUsersUrl(UsersTableType.risk),
      disabled: false,
      isBeta: true,
      betaOptions: {
        text: TECHNICAL_PREVIEW,
      },
    },
  };

  if (!hasMlUserPermissions) {
    hiddenTabs.push(UsersTableType.anomalies);
  }

  if (!isRiskyUserEnabled) {
    hiddenTabs.push(UsersTableType.risk);
  }

  return omit(hiddenTabs, userNavTabs);
};
