/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_GRAPH_TITLE = i18n.translate(
  'xpack.securitySolution.alertsView.alertsGraphTitle',
  {
    defaultMessage: 'External alert trend',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.alertsView.unit', {
    values: { totalCount },
    defaultMessage: `external {totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const ERROR_FETCHING_ALERTS_DATA = i18n.translate(
  'xpack.securitySolution.alertsView.errorFetchingAlertsData',
  {
    defaultMessage: 'Failed to query alerts data',
  }
);
