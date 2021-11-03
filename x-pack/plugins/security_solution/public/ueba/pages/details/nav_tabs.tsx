/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import { UebaDetailsNavTab } from './types';
import { UebaTableType } from '../../store/model';
import { UEBA_PATH } from '../../../../common/constants';

const getTabsOnUebaDetailsUrl = (hostName: string, tabName: UebaTableType) =>
  `${UEBA_PATH}/${hostName}/${tabName}`;

export const navTabsUebaDetails = (hostName: string): UebaDetailsNavTab => {
  return {
    [UebaTableType.hostRules]: {
      id: UebaTableType.hostRules,
      name: i18n.HOST_RULES,
      href: getTabsOnUebaDetailsUrl(hostName, UebaTableType.hostRules),
      disabled: false,
    },
    [UebaTableType.hostTactics]: {
      id: UebaTableType.hostTactics,
      name: i18n.HOST_TACTICS,
      href: getTabsOnUebaDetailsUrl(hostName, UebaTableType.hostTactics),
      disabled: false,
    },
    [UebaTableType.userRules]: {
      id: UebaTableType.userRules,
      name: i18n.USER_RULES,
      href: getTabsOnUebaDetailsUrl(hostName, UebaTableType.userRules),
      disabled: false,
    },
  };
};
