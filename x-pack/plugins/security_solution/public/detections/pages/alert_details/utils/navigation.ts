/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDetailNavTabs } from '../types';
import { ALERTS_PATH } from '../../../../../common/constants';
import { AlertDetailRouteType } from '../types';
import * as i18n from '../translations';

export const getAlertDetailsTabUrl = (alertId: string, tabName: AlertDetailRouteType) =>
  `${ALERTS_PATH}/${alertId}/${tabName}`;

export const getAlertDetailsNavTabs = (alertId: string): AlertDetailNavTabs => ({
  [AlertDetailRouteType.summary]: {
    id: AlertDetailRouteType.summary,
    name: i18n.SUMMARY_PAGE_TITLE,
    href: getAlertDetailsTabUrl(alertId, AlertDetailRouteType.summary),
    disabled: false,
  },
});
