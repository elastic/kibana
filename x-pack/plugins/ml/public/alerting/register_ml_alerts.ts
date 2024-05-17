/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { ML_APP_ROUTE, PLUGIN_ID } from '../../common/constants/app';
import type { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';
import type { MlCapabilities } from '../../common/types/capabilities';
import { formatExplorerUrl } from '../locator/formatters/anomaly_detection';
import type { MlCoreSetup } from '../plugin';
import { registerAnomalyDetectionRule } from './anomaly_detection_rule';
import { registerJobsHealthAlertingRule } from './jobs_health_rule';

export function registerMlAlerts(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  getStartServices: MlCoreSetup['getStartServices'],
  mlCapabilities: MlCapabilities,
  alerting?: AlertingSetup
) {
  registerAnomalyDetectionRule(triggersActionsUi, getStartServices, mlCapabilities);

  registerJobsHealthAlertingRule(triggersActionsUi, alerting);

  if (alerting) {
    registerNavigation(alerting);
  }

  // Async import to prevent a bundle size increase
  Promise.all([getStartServices(), import('./anomaly_detection_alerts_table')]).then(
    ([[_, mlStartDependencies], { registerAlertsTableConfiguration }]) => {
      registerAlertsTableConfiguration(triggersActionsUi, mlStartDependencies.fieldFormats);
    }
  );
}

export function registerNavigation(alerting: AlertingSetup) {
  alerting.registerNavigation(PLUGIN_ID, ML_ALERT_TYPES.ANOMALY_DETECTION, (alert) => {
    const alertParams = alert.params as MlAnomalyDetectionAlertParams;
    const jobIds = [
      ...new Set([
        ...(alertParams.jobSelection.jobIds ?? []),
        ...(alertParams.jobSelection.groupIds ?? []),
      ]),
    ];

    return formatExplorerUrl(ML_APP_ROUTE, { jobIds });
  });
}
