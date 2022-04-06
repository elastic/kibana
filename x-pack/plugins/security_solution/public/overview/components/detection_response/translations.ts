/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS_CRITICAL_LABEL = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.criticalLabel',
  {
    defaultMessage: 'Critical',
  }
);

export const STATUS_HIGH_LABEL = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.highLabel',
  {
    defaultMessage: 'High',
  }
);

export const STATUS_MEDIUM_LABEL = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.mediumLabel',
  {
    defaultMessage: 'Medium',
  }
);

export const STATUS_LOW_LABEL = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.lowLabel',
  {
    defaultMessage: 'Low',
  }
);

export const STATUS_OPEN = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.title.open',
  {
    defaultMessage: 'Open',
  }
);

export const STATUS_ACKNOWLEDGED = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.title.acknowledged',
  {
    defaultMessage: 'Acknowledged',
  }
);

export const STATUS_CLOSED = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.title.closed',
  {
    defaultMessage: 'Closed',
  }
);

export const STATUS_IN_PROGRESS = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.donut.title.inProgress',
  {
    defaultMessage: 'In progress',
  }
);

export const ALERTS = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.responseOps.alertsByStatus.totalAlerts', {
    values: { totalAlerts },
    defaultMessage: 'total {totalAlerts, plural, =1 {alert} other {alerts}}',
  });

export const ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.responseOps.alertsByStatus.title',
  {
    defaultMessage: 'Alerts',
  }
);
