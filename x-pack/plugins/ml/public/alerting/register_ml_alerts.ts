/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { MlStartDependencies } from '../plugin';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';

export function registerMlAlerts(
  alertTypeRegistry: MlStartDependencies['triggersActionsUi']['alertTypeRegistry']
) {
  alertTypeRegistry.register({
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
        },
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

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.anomalyDetection.defaultActionMessage',
      {
        defaultMessage: `Elastic Stack Machine Learning Alert:
- Job IDs: \\{\\{#context.jobIds\\}\\}\\{\\{context.jobIds\\}\\} - \\{\\{/context.jobIds\\}\\}
- Time: \\{\\{context.timestampIso8601\\}\\}
- Anomaly score: \\{\\{context.score\\}\\}

\\{\\{#context.isInterim\\}\\}
Alerts are raised based on real-time scores. Remember that scores may be adjusted over time as data continues to be analyzed.
\\{\\{/context.isInterim\\}\\}

\\{\\{! Section might be not relevant if selected jobs don't contain influencer configuration \\}\\}
Top influencers:
\\{\\{#context.topInfluencers\\}\\}
  \\{\\{influencer_field_name\\}\\} = \\{\\{influencer_field_value\\}\\} [\\{\\{score\\}\\}]
\\{\\{/context.topInfluencers\\}\\}

Top records:
\\{\\{#context.topRecords\\}\\}
  \\{\\{function\\}\\}(\\{\\{field_name\\}\\}) \\{\\{by_field_value\\}\\} \\{\\{over_field_value\\}\\} \\{\\{partition_field_value\\}\\} [\\{\\{score\\}\\}]
\\{\\{/context.topRecords\\}\\}

\\{\\{! Replace kibanaBaseUrl if not configured in Kibana \\}\\}
[Open in Anomaly Explorer](\\{\\{\\{context.kibanaBaseUrl\\}\\}\\}\\{\\{\\{context.anomalyExplorerUrl\\}\\}\\})
`,
      }
    ),
  });
}
