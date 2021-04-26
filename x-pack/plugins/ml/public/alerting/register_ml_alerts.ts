/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import type { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';
import type { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';
import type { PluginSetupContract as AlertingSetup } from '../../../alerting/public';
import { PLUGIN_ID } from '../../common/constants/app';
import { createExplorerUrl } from '../ml_url_generator/anomaly_detection_urls_generator';
import { validateLookbackInterval, validateTopNBucket } from './validators';

export function registerMlAlerts(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  alerting?: AlertingSetup
) {
  triggersActionsUi.alertTypeRegistry.register({
    id: ML_ALERT_TYPES.ANOMALY_DETECTION,
    description: i18n.translate('xpack.ml.alertTypes.anomalyDetection.description', {
      defaultMessage: 'Alert when anomaly detection jobs results match the condition.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/machine-learning/${docLinks.DOC_LINK_VERSION}/ml-configuring-alerts.html`;
    },
    alertParamsExpression: lazy(() => import('./ml_anomaly_alert_trigger')),
    validate: (alertParams: MlAnomalyDetectionAlertParams) => {
      const validationResult = {
        errors: {
          jobSelection: new Array<string>(),
          severity: new Array<string>(),
          resultType: new Array<string>(),
          topNBuckets: new Array<string>(),
          lookbackInterval: new Array<string>(),
        } as Record<keyof MlAnomalyDetectionAlertParams, string[]>,
      };

      if (
        !alertParams.jobSelection?.jobIds?.length &&
        !alertParams.jobSelection?.groupIds?.length
      ) {
        validationResult.errors.jobSelection.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.jobSelection.errorMessage', {
            defaultMessage: 'Job selection is required',
          })
        );
      }

      // Since 7.13 we support single job selection only
      if (
        (Array.isArray(alertParams.jobSelection?.groupIds) &&
          alertParams.jobSelection?.groupIds.length > 0) ||
        (Array.isArray(alertParams.jobSelection?.jobIds) &&
          alertParams.jobSelection?.jobIds.length > 1)
      ) {
        validationResult.errors.jobSelection.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.singleJobSelection.errorMessage', {
            defaultMessage: 'Only one job per rule is allowed',
          })
        );
      }

      if (alertParams.severity === undefined) {
        validationResult.errors.severity.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.severity.errorMessage', {
            defaultMessage: 'Anomaly severity is required',
          })
        );
      }

      if (alertParams.resultType === undefined) {
        validationResult.errors.resultType.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.resultType.errorMessage', {
            defaultMessage: 'Result type is required',
          })
        );
      }

      if (
        !!alertParams.lookbackInterval &&
        validateLookbackInterval(alertParams.lookbackInterval)
      ) {
        validationResult.errors.lookbackInterval.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.lookbackInterval.errorMessage', {
            defaultMessage: 'Lookback interval is invalid',
          })
        );
      }

      if (
        typeof alertParams.topNBuckets === 'number' &&
        validateTopNBucket(alertParams.topNBuckets)
      ) {
        validationResult.errors.topNBuckets.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.topNBuckets.errorMessage', {
            defaultMessage: 'Number of buckets is invalid',
          })
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.anomalyDetection.defaultActionMessage',
      {
        defaultMessage: `Elastic Stack Machine Learning Alert:
- Job IDs: \\{\\{context.jobIds\\}\\}
- Time: \\{\\{context.timestampIso8601\\}\\}
- Anomaly score: \\{\\{context.score\\}\\}

\\{\\{context.message\\}\\}

\\{\\{#context.topInfluencers.length\\}\\}
  Top influencers:
  \\{\\{#context.topInfluencers\\}\\}
    \\{\\{influencer_field_name\\}\\} = \\{\\{influencer_field_value\\}\\} [\\{\\{score\\}\\}]
  \\{\\{/context.topInfluencers\\}\\}
\\{\\{/context.topInfluencers.length\\}\\}

\\{\\{#context.topRecords.length\\}\\}
  Top records:
  \\{\\{#context.topRecords\\}\\}
    \\{\\{function\\}\\}(\\{\\{field_name\\}\\}) \\{\\{by_field_value\\}\\} \\{\\{over_field_value\\}\\} \\{\\{partition_field_value\\}\\} [\\{\\{score\\}\\}]
  \\{\\{/context.topRecords\\}\\}
\\{\\{/context.topRecords.length\\}\\}

\\{\\{! Replace kibanaBaseUrl if not configured in Kibana \\}\\}
[Open in Anomaly Explorer](\\{\\{\\{kibanaBaseUrl\\}\\}\\}\\{\\{\\{context.anomalyExplorerUrl\\}\\}\\})
`,
      }
    ),
  });

  if (alerting) {
    registerNavigation(alerting);
  }
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

    return createExplorerUrl('', { jobIds });
  });
}
