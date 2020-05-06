/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CoreStart } from '../../../../src/core/public';
import { AlertType } from '../common/alert_types';
import { ErrorRateAlertTrigger } from './components/shared/ErrorRateAlertTrigger';
import {
  TransactionDurationAlertTrigger,
  TransactionDurationAlertTriggerProps
} from './components/shared/TransactionDurationAlertTrigger';
import { ApmPluginContext } from './context/ApmPluginContext';
import { ApmPluginStartDeps } from './plugin';

export function registerAlertTypes(
  core: CoreStart,
  plugins: ApmPluginStartDeps
) {
  // TransactionDurationAlertTrigger requires core.notifications from the context,
  // so create a wrapper component for it
  function WrappedTransactionDurationAlertTrigger(
    props: TransactionDurationAlertTriggerProps
  ) {
    return (
      <ApmPluginContext.Provider value={{ core }}>
        <TransactionDurationAlertTrigger {...props} />
      </ApmPluginContext.Provider>
    );
  }

  plugins.triggers_actions_ui.alertTypeRegistry.register({
    id: AlertType.ErrorRate,
    name: i18n.translate('xpack.apm.alertTypes.errorRate', {
      defaultMessage: 'Error rate'
    }),
    iconClass: 'bell',
    alertParamsExpression: ErrorRateAlertTrigger,
    validate: () => ({
      errors: []
    })
  });

  plugins.triggers_actions_ui.alertTypeRegistry.register({
    id: AlertType.TransactionDuration,
    name: i18n.translate('xpack.apm.alertTypes.transactionDuration', {
      defaultMessage: 'Transaction duration'
    }),
    iconClass: 'bell',
    alertParamsExpression: WrappedTransactionDurationAlertTrigger,
    validate: () => ({
      errors: []
    })
  });
}
