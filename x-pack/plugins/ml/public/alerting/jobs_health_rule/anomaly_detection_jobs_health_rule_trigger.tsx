/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { AlertTypeParamsExpressionProps } from '../../../../triggers_actions_ui/public';
import { MlAnomalyDetectionJobsHealthRuleParams } from '../../../common/types/alerts';
import { JobSelectorControl } from '../job_selector';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { HttpService } from '../../application/services/http_service';
import { useMlKibana } from '../../application/contexts/kibana';
import { TestsSelectionControl } from './tests_selection_control';

export type MlAnomalyAlertTriggerProps = AlertTypeParamsExpressionProps<MlAnomalyDetectionJobsHealthRuleParams>;

const AnomalyDetectionJobsHealthRuleTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  alertParams,
  setAlertParams,
  errors,
}) => {
  const {
    services: { http },
  } = useMlKibana();
  const mlHttpService = useMemo(() => new HttpService(http), [http]);
  const adJobsApiService = useMemo(() => jobsApiProvider(mlHttpService), [mlHttpService]);

  const jobsAndGroupIds: string[] = useMemo(
    () => (Object.values(alertParams.includeJobs ?? {}) as string[][]).flat(),
    [alertParams.jobSelection]
  );

  const onAlertParamChange = useCallback(
    <T extends keyof MlAnomalyDetectionJobsHealthRuleParams>(param: T) => (
      update: MlAnomalyDetectionJobsHealthRuleParams[T]
    ) => {
      setAlertParams(param, update);
    },
    []
  );

  return (
    <EuiForm data-test-subj={'mlAnomalyAlertForm'}>
      <JobSelectorControl
        jobsAndGroupIds={jobsAndGroupIds}
        adJobsApiService={adJobsApiService}
        onChange={useCallback(onAlertParamChange('includeJobs'), [])}
        errors={Array.isArray(errors.jobSelection) ? errors.jobSelection : []}
      />

      <EuiSpacer size="m" />

      <TestsSelectionControl
        config={alertParams.testsConfig}
        onChange={useCallback(onAlertParamChange('testsConfig'), [])}
      />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading

// eslint-disable-next-line import/no-default-export
export default AnomalyDetectionJobsHealthRuleTrigger;
