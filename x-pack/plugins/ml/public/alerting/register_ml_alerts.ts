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

export function registerMlAlerts(
  alertTypeRegistry: MlStartDependencies['triggersActionsUi']['alertTypeRegistry']
) {
  alertTypeRegistry.register({
    id: ML_ALERT_TYPES.ANOMALY_DETECTION,
    description: i18n.translate('xpack.ml.alertTypes.anomalyThreshold.description', {
      defaultMessage: 'Alert when anomaly detection jobs results match the condition.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      // TODO add the documentation link
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/ml-alerts.html`;
    },
    alertParamsExpression: lazy(() => import('./ml_anomaly_alert_trigger')),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.anomalyThreshold.defaultActionMessage',
      {
        defaultMessage: `Elastic Stack Machine Learning Alert:
- Job IDs: \\{\\{#context.jobIds\\}\\}\\{\\{context.jobIds\\}\\} - \\{\\{/context.jobIds\\}\\}
- Time: \\{\\{context.timestampIso8601\\}\\}
- Anomaly score: \\{\\{context.score\\}\\}

\\{\\{! Section might be not relevant if selected jobs don't contain influencer configuration \\}\\}
Top influencers:
\\{\\{#context.topInfluencers\\}\\}
  \\{\\{influencer_field_name\\}\\} = \\{\\{influencer_field_value\\}\\} [\\{\\{score\\}\\}]
\\{\\{/context.topInfluencers\\}\\}

Top records:
\\{\\{#context.topRecords\\}\\}
  \\{\\{function\\}\\}(\\{\\{field_name\\}\\}) \\{\\{by_field_value\\}\\} \\{\\{over_field_value\\}\\} \\{\\{partition_field_value\\}\\} [\\{\\{score\\}\\}]
\\{\\{/context.topRecords\\}\\}

\\{\\{! Complete the URL with your Kibana hostname \\}\\}
[Open in Anomaly Explorer](https://KIBANA_HOST\\{\\{\\{context.anomalyExplorerUrl\\}\\}\\})
`,
      }
    ),
  });
}
