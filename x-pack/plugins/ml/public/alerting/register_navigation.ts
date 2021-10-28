/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PLUGIN_ID } from '../../common/constants/app';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';
import { formatExplorerUrl } from '../locator/formatters';
import type { PluginSetupContract as AlertingSetup } from '../../../alerting/public';

export function registerNavigation(alerting: AlertingSetup) {
  alerting.registerNavigation(PLUGIN_ID, ML_ALERT_TYPES.ANOMALY_DETECTION, (alert) => {
    const alertParams = alert.params as MlAnomalyDetectionAlertParams;
    const jobIds = [
      ...new Set([
        ...(alertParams.jobSelection.jobIds ?? []),
        ...(alertParams.jobSelection.groupIds ?? []),
      ]),
    ];

    return formatExplorerUrl('', { jobIds });
  });
}
