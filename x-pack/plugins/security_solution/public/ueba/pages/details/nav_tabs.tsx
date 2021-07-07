/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import { UebaDetailsNavTab } from './types';
import { UebaDetailsTableType } from '../../store/model';
import { UEBA_PATH } from '../../../../common/constants';

const getTabsOnUebaDetailsUrl = (hostName: string, tabName: UebaDetailsTableType) =>
  `${UEBA_PATH}/${hostName}/${tabName}`;

export const navTabsUebaDetails = (hostName: string): UebaDetailsNavTab => {
  return {
    [UebaDetailsTableType.hostRules]: {
      id: UebaDetailsTableType.hostRules,
      name: i18n.HOST_RULES,
      href: getTabsOnUebaDetailsUrl(hostName, UebaDetailsTableType.hostRules),
      disabled: false,
    },
    [UebaDetailsTableType.hostTactics]: {
      id: UebaDetailsTableType.hostTactics,
      name: i18n.HOST_TACTICS,
      href: getTabsOnUebaDetailsUrl(hostName, UebaDetailsTableType.hostTactics),
      disabled: false,
    },
    [UebaDetailsTableType.userRules]: {
      id: UebaDetailsTableType.userRules,
      name: i18n.USER_RULES,
      href: getTabsOnUebaDetailsUrl(hostName, UebaDetailsTableType.userRules),
      disabled: false,
    },
  };
};
