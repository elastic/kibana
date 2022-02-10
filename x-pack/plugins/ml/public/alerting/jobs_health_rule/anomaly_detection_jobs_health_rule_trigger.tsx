/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { EuiComboBoxOptionOption, EuiForm, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { RuleTypeParamsExpressionProps } from '../../../../triggers_actions_ui/public';
import { MlAnomalyDetectionJobsHealthRuleParams } from '../../../common/types/alerts';
import { JobSelectorControl } from '../job_selector';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { HttpService } from '../../application/services/http_service';
import { useMlKibana } from '../../application/contexts/kibana';
import { TestsSelectionControl } from './tests_selection_control';
import { isPopulatedObject } from '../../../common';
import { ALL_JOBS_SELECTION } from '../../../common/constants/alerts';
import { BetaBadge } from '../beta_badge';
import { isDefined } from '../../../common/types/guards';

export type MlAnomalyAlertTriggerProps =
  RuleTypeParamsExpressionProps<MlAnomalyDetectionJobsHealthRuleParams>;

const AnomalyDetectionJobsHealthRuleTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  ruleParams,
  setRuleParams,
  errors,
}) => {
  const {
    services: { http },
  } = useMlKibana();
  const mlHttpService = useMemo(() => new HttpService(http), [http]);
  const adJobsApiService = useMemo(() => jobsApiProvider(mlHttpService), [mlHttpService]);
  const [excludeJobsOptions, setExcludeJobsOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const includeJobsAndGroupIds: string[] = useMemo(
    () => (Object.values(ruleParams.includeJobs ?? {}) as string[][]).flat(),
    [ruleParams.includeJobs]
  );

  const excludeJobsAndGroupIds: string[] = useMemo(
    () => (Object.values(ruleParams.excludeJobs ?? {}) as string[][]).flat(),
    [ruleParams.excludeJobs]
  );

  const onAlertParamChange = useCallback(
    <T extends keyof MlAnomalyDetectionJobsHealthRuleParams>(param: T) =>
      (update: MlAnomalyDetectionJobsHealthRuleParams[T]) => {
        setRuleParams(param, update);
      },
    []
  );

  const formErrors = Object.values(errors).flat();
  const isFormInvalid = formErrors.length > 0;

  useDebounce(
    function updateExcludeJobsOptions() {
      const areAllJobsSelected = ruleParams.includeJobs?.jobIds?.[0] === ALL_JOBS_SELECTION;

      if (!areAllJobsSelected && !ruleParams.includeJobs?.groupIds?.length) {
        // It only makes sense to suggest excluded jobs options when at least one group or all jobs are selected
        setExcludeJobsOptions([]);
        return;
      }

      adJobsApiService
        .jobs(areAllJobsSelected ? [] : (ruleParams.includeJobs.groupIds as string[]))
        .then((jobs) => {
          setExcludeJobsOptions([
            {
              label: i18n.translate('xpack.ml.jobSelector.jobOptionsLabel', {
                defaultMessage: 'Jobs',
              }),
              options: jobs.map((v) => ({ label: v.job_id })),
            },
            {
              label: i18n.translate('xpack.ml.jobSelector.groupOptionsLabel', {
                defaultMessage: 'Groups',
              }),
              options: [
                ...new Set(
                  jobs
                    .map((v) => v.groups)
                    .flat()
                    .filter((v) => isDefined(v) && !ruleParams.includeJobs.groupIds?.includes(v))
                ),
              ].map((v) => ({ label: v! })),
            },
          ]);
        });
    },
    500,
    [ruleParams.includeJobs]
  );

  return (
    <EuiForm
      data-test-subj={'mlJobsHealthAlertingRuleForm'}
      invalidCallout={'none'}
      error={formErrors}
      isInvalid={isFormInvalid}
    >
      <BetaBadge
        message={i18n.translate(
          'xpack.ml.alertTypes.jobsHealthAlertingRule.betaBadgeTooltipContent',
          {
            defaultMessage: `Anomaly detection job health alerts are a beta feature. We'd love to hear your feedback.`,
          }
        )}
      />

      <JobSelectorControl
        jobsAndGroupIds={includeJobsAndGroupIds}
        adJobsApiService={adJobsApiService}
        onChange={useCallback(onAlertParamChange('includeJobs'), [])}
        errors={Array.isArray(errors.includeJobs) ? errors.includeJobs : []}
        multiSelect
        allowSelectAll
        label={
          <FormattedMessage
            id="xpack.ml.alertTypes.jobsHealthAlertingRule.includeJobs.label"
            defaultMessage="Include jobs or groups"
          />
        }
      />

      <EuiSpacer size="m" />

      <JobSelectorControl
        jobsAndGroupIds={excludeJobsAndGroupIds}
        adJobsApiService={adJobsApiService}
        onChange={useCallback((update) => {
          const callback = onAlertParamChange('excludeJobs');
          if (isPopulatedObject(update)) {
            callback(update);
          } else {
            callback(null);
          }
        }, [])}
        errors={Array.isArray(errors.excludeJobs) ? errors.excludeJobs : []}
        multiSelect
        label={
          <FormattedMessage
            id="xpack.ml.alertTypes.jobsHealthAlertingRule.excludeJobs.label"
            defaultMessage="Exclude jobs or groups"
          />
        }
        options={excludeJobsOptions}
      />

      <EuiSpacer size="m" />

      <TestsSelectionControl
        config={ruleParams.testsConfig}
        onChange={useCallback(onAlertParamChange('testsConfig'), [])}
        errors={Array.isArray(errors.testsConfig) ? errors.testsConfig : []}
      />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading

// eslint-disable-next-line import/no-default-export
export default AnomalyDetectionJobsHealthRuleTrigger;
