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
import { getResultJobsHealthRuleConfig } from '../../../common/util/alerts';
import { validateLookbackInterval } from '../validators';

export function registerJobsHealthAlertingRule(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  alerting?: AlertingSetup
) {
  triggersActionsUi.ruleTypeRegistry.register({
    id: ML_ALERT_TYPES.AD_JOBS_HEALTH,
    description: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.description', {
      defaultMessage:
        'Alert when anomaly detection jobs experience operational issues. Enable suitable alerts for critically important jobs.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return docLinks.links.ml.alertingRules;
    },
    ruleParamsExpression: lazy(() => import('./anomaly_detection_jobs_health_rule_trigger')),
    validate: (alertParams: MlAnomalyDetectionJobsHealthRuleParams) => {
      const validationResult = {
        errors: {
          includeJobs: new Array<string>(),
          testsConfig: new Array<string>(),
          delayedData: new Array<string>(),
        } as Record<keyof MlAnomalyDetectionJobsHealthRuleParams, string[]>,
      };

      if (!alertParams.includeJobs?.jobIds?.length && !alertParams.includeJobs?.groupIds?.length) {
        validationResult.errors.includeJobs.push(
          i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.includeJobs.errorMessage', {
            defaultMessage: 'Job selection is required',
          })
        );
      }

      const resultTestConfig = getResultJobsHealthRuleConfig(alertParams.testsConfig);

      if (Object.values(resultTestConfig).every((v) => v?.enabled === false)) {
        validationResult.errors.testsConfig.push(
          i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.testsConfig.errorMessage', {
            defaultMessage: 'At least one health check must be enabled.',
          })
        );
      }

      if (
        !!resultTestConfig.delayedData.timeInterval &&
        validateLookbackInterval(resultTestConfig.delayedData.timeInterval)
      ) {
        validationResult.errors.delayedData.push(
          i18n.translate(
            'xpack.ml.alertTypes.jobsHealthAlertingRule.testsConfig.delayedData.timeIntervalErrorMessage',
            {
              defaultMessage: 'Invalid time interval',
            }
          )
        );
      }

      if (resultTestConfig.delayedData.docsCount === 0) {
        validationResult.errors.delayedData.push(
          i18n.translate(
            'xpack.ml.alertTypes.jobsHealthAlertingRule.testsConfig.delayedData.docsCountErrorMessage',
            {
              defaultMessage: 'Invalid number of documents',
            }
          )
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.defaultActionMessage',
      {
        defaultMessage: `[\\{\\{rule.name\\}\\}] Anomaly detection jobs health check result:
\\{\\{context.message\\}\\}
\\{\\{#context.results\\}\\}
  Job ID: \\{\\{job_id\\}\\}
  \\{\\{#datafeed_id\\}\\}Datafeed ID: \\{\\{datafeed_id\\}\\}
  \\{\\{/datafeed_id\\}\\}\\{\\{#datafeed_state\\}\\}Datafeed state: \\{\\{datafeed_state\\}\\}
  \\{\\{/datafeed_state\\}\\}\\{\\{#memory_status\\}\\}Memory status: \\{\\{memory_status\\}\\}
  \\{\\{/memory_status\\}\\}\\{\\{#model_bytes\\}\\}Model size: \\{\\{model_bytes\\}\\}
  \\{\\{/model_bytes\\}\\}\\{\\{#model_bytes_memory_limit\\}\\}Model memory limit: \\{\\{model_bytes_memory_limit\\}\\}
  \\{\\{/model_bytes_memory_limit\\}\\}\\{\\{#peak_model_bytes\\}\\}Peak model bytes: \\{\\{peak_model_bytes\\}\\}
  \\{\\{/peak_model_bytes\\}\\}\\{\\{#model_bytes_exceeded\\}\\}Model exceeded: \\{\\{model_bytes_exceeded\\}\\}
  \\{\\{/model_bytes_exceeded\\}\\}\\{\\{#log_time\\}\\}Memory logging time: \\{\\{log_time\\}\\}
  \\{\\{/log_time\\}\\}\\{\\{#failed_category_count\\}\\}Failed category count: \\{\\{failed_category_count\\}\\}
  \\{\\{/failed_category_count\\}\\}\\{\\{#annotation\\}\\}Annotation: \\{\\{annotation\\}\\}
  \\{\\{/annotation\\}\\}\\{\\{#missed_docs_count\\}\\}Number of missed documents: \\{\\{missed_docs_count\\}\\}
  \\{\\{/missed_docs_count\\}\\}\\{\\{#end_timestamp\\}\\}Latest finalized bucket with missing docs: \\{\\{end_timestamp\\}\\}
  \\{\\{/end_timestamp\\}\\}\\{\\{#errors\\}\\}Error message: \\{\\{message\\}\\} \\{\\{/errors\\}\\}
\\{\\{/context.results\\}\\}
`,
      }
    ),
  });
}
