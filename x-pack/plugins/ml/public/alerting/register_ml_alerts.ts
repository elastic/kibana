/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { MlStartDependencies } from '../plugin';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';

export function registerMlAlerts(
  alertTypeRegistry: MlStartDependencies['triggersActionsUi']['alertTypeRegistry']
) {
  alertTypeRegistry.register({
    id: ML_ALERT_TYPES.ANOMALY_THRESHOLD,
    description: i18n.translate('xpack.ml.alertTypes.anomalyThreshold.description', {
      defaultMessage: 'Alert when anomaly score reaches the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(() => import('./ml_anomaly_threshold_trigger')),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.anomalyThreshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} alert is firing because of the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Threshold: \\{\\{context.threshold\\}\\} errors
- Triggered value: \\{\\{context.triggerValue\\}\\} errors over the last \\{\\{context.interval\\}\\}`,
      }
    ),
  });
}
