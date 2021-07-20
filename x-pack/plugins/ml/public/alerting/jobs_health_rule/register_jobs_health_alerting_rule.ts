/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../../triggers_actions_ui/public';
import { PluginSetupContract as AlertingSetup } from '../../../../alerting/public';
import { ML_ALERT_TYPES } from '../../../common/constants/alerts';
import { MlAnomalyDetectionJobsHealthRuleParams } from '../../../common/types/alerts';

export function registerJobsHealthAlertingRule(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  alerting?: AlertingSetup
) {
  triggersActionsUi.alertTypeRegistry.register({
    id: ML_ALERT_TYPES.AD_JOBS_HEALTH,
    description: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.description', {
      defaultMessage: 'Alert when anomaly detection jobs experiencing realtime issues.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/machine-learning/${docLinks.DOC_LINK_VERSION}/ml-configuring-alerts.html`;
    },
    alertParamsExpression: lazy(() => import('./anomaly_detection_jobs_health_rule_trigger')),
    validate: (alertParams: MlAnomalyDetectionJobsHealthRuleParams) => {
      const validationResult = {
        errors: {
          includeJobs: new Array<string>(),
          testsConfig: new Array<string>(),
        } as Record<keyof MlAnomalyDetectionJobsHealthRuleParams, string[]>,
      };

      if (!alertParams.includeJobs?.jobIds?.length && !alertParams.includeJobs?.groupIds?.length) {
        validationResult.errors.includeJobs.push(
          i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.includeJobs.errorMessage', {
            defaultMessage: 'Job selection is required',
          })
        );
      }

      if (
        alertParams.testsConfig &&
        Object.values(alertParams.testsConfig).every((v) => v?.enabled === false)
      ) {
        validationResult.errors.testsConfig.push(
          i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.testsConfig.errorMessage', {
            defaultMessage: 'At least one health check has to enabled',
          })
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.defaultActionMessage',
      {
        defaultMessage: `Anomaly detection jobs health check result:
\\{\\{context.message\\}\\}
- Job IDs: \\{\\{context.jobIds\\}\\}
`,
      }
    ),
  });
}
