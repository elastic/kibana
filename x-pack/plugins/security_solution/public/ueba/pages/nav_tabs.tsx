/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import { UebaTableType } from '../store/model';
import { UebaNavTab } from './navigation/types';
import { UEBA_PATH } from '../../../common/constants';

const getTabsOnUebaUrl = (tabName: UebaTableType) => `${UEBA_PATH}/${tabName}`;

export const navTabsUeba: UebaNavTab = {
  [UebaTableType.riskScore]: {
    id: UebaTableType.riskScore,
    name: i18n.RISK_SCORE_TITLE,
    href: getTabsOnUebaUrl(UebaTableType.riskScore),
    disabled: false,
  },
};
