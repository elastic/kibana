/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ALERT_BY_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByGrouping.chartTitle',
  {
    defaultMessage: 'Top alerts by',
  }
);

export const EMPTY_DATA_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByGrouping.noItemsFoundMessage',
  {
    defaultMessage: 'No items found',
  }
);

export const OTHER = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByGrouping.otherGroup',
  {
    defaultMessage: 'Other',
  }
);
