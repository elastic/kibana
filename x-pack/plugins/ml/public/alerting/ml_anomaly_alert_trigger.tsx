/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiSpacer, EuiForm } from '@elastic/eui';
import useMount from 'react-use/lib/useMount';
import { JobSelectorControl } from './job_selector';
import { useMlKibana } from '../application/contexts/kibana';
import { jobsApiProvider } from '../application/services/ml_api_service/jobs';
import { HttpService } from '../application/services/http_service';
import { SeverityControl } from './severity_control';
import { ResultTypeSelector } from './result_type_selector';
import { alertingApiProvider } from '../application/services/ml_api_service/alerting';
import { PreviewAlertCondition } from './preview_alert_condition';
import { ANOMALY_THRESHOLD } from '../../common';
import { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';
import { ANOMALY_RESULT_TYPE } from '../../common/constants/anomalies';
import { InterimResultsControl } from './interim_results_control';

interface MlAnomalyAlertTriggerProps {
  alertParams: MlAnomalyDetectionAlertParams;
  setAlertParams: <T extends keyof MlAnomalyDetectionAlertParams>(
    key: T,
    value: MlAnomalyDetectionAlertParams[T]
  ) => void;
  setAlertProperty: (prop: string, update: Partial<MlAnomalyDetectionAlertParams>) => void;
  errors: Record<keyof MlAnomalyDetectionAlertParams, string[]>;
}

const MlAnomalyAlertTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  alertParams,
  setAlertParams,
  setAlertProperty,
  errors,
}) => {
  const {
    services: { http },
  } = useMlKibana();
  const mlHttpService = useMemo(() => new HttpService(http), [http]);
  const adJobsApiService = useMemo(() => jobsApiProvider(mlHttpService), [mlHttpService]);
  const alertingApiService = useMemo(() => alertingApiProvider(mlHttpService), [mlHttpService]);

  const onAlertParamChange = useCallback(
    <T extends keyof MlAnomalyDetectionAlertParams>(param: T) => (
      update: MlAnomalyDetectionAlertParams[T]
    ) => {
      setAlertParams(param, update);
    },
    []
  );

  useMount(function setDefaults() {
    const { jobSelection, ...rest } = alertParams;
    if (Object.keys(rest).length === 0) {
      setAlertProperty('params', {
        // Set defaults
        severity: ANOMALY_THRESHOLD.CRITICAL,
        resultType: ANOMALY_RESULT_TYPE.BUCKET,
        includeInterim: true,
        // Preserve job selection
        jobSelection,
      });
    }
  });

  return (
    <EuiForm data-test-subj={'mlAnomalyAlertForm'}>
      <JobSelectorControl
        jobSelection={alertParams.jobSelection}
        adJobsApiService={adJobsApiService}
        onChange={useCallback(onAlertParamChange('jobSelection'), [])}
        errors={errors.jobSelection}
      />
      <ResultTypeSelector
        value={alertParams.resultType}
        onChange={useCallback(onAlertParamChange('resultType'), [])}
      />
      <SeverityControl
        value={alertParams.severity}
        onChange={useCallback(onAlertParamChange('severity'), [])}
      />
      <EuiSpacer size="m" />
      <InterimResultsControl
        value={alertParams.includeInterim}
        onChange={useCallback(onAlertParamChange('includeInterim'), [])}
      />
      <EuiSpacer size="m" />

      <PreviewAlertCondition alertingApiService={alertingApiService} alertParams={alertParams} />

      <EuiSpacer size="m" />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MlAnomalyAlertTrigger;
