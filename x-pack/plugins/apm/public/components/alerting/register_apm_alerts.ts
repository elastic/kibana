/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { AlertType } from '../../../common/alert_types';
import { ApmPluginStartDeps } from '../../plugin';

export function registerApmAlerts(
  alertTypeRegistry: ApmPluginStartDeps['triggersActionsUi']['alertTypeRegistry']
) {
  alertTypeRegistry.register({
    id: AlertType.ErrorCount,
    name: i18n.translate('xpack.apm.alertTypes.errorCount', {
      defaultMessage: 'Error count threshold',
    }),
    iconClass: 'bell',
    alertParamsExpression: lazy(() => import('./ErrorCountAlertTrigger')),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
  });

  alertTypeRegistry.register({
    id: AlertType.TransactionDuration,
    name: i18n.translate('xpack.apm.alertTypes.transactionDuration', {
      defaultMessage: 'Transaction duration threshold',
    }),
    iconClass: 'bell',
    alertParamsExpression: lazy(
      () => import('./TransactionDurationAlertTrigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
  });

  alertTypeRegistry.register({
    id: AlertType.TransactionErrorRate,
    name: i18n.translate('xpack.apm.alertTypes.transactionErrorRate', {
      defaultMessage: 'Transaction error rate threshold',
    }),
    iconClass: 'bell',
    alertParamsExpression: lazy(
      () => import('./TransactionErrorRateAlertTrigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
  });

  alertTypeRegistry.register({
    id: AlertType.TransactionDurationAnomaly,
    name: i18n.translate('xpack.apm.alertTypes.transactionDurationAnomaly', {
      defaultMessage: 'Transaction duration anomaly',
    }),
    iconClass: 'bell',
    alertParamsExpression: lazy(
      () => import('./TransactionDurationAnomalyAlertTrigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
  });
}
