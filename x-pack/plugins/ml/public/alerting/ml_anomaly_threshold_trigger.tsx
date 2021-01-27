/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback } from 'react';
import { JobSelectorControl } from './job_selector';
import { useMlKibana } from '../application/contexts/kibana';
import { jobsApiProvider } from '../application/services/ml_api_service/jobs';
import { HttpService } from '../application/services/http_service';
import { SeveritySelector } from './severity_selector';
import { ResultTypeSelector } from './result_type_selector';
import type { AnomalyResultType } from '../../common/types/anomalies';
import { IntervalSelector } from './interval_selector';

interface MlAnomalyThresholdAlertParams {
  jobSelection: {
    jobIds?: string[];
    groupIds?: string[];
  };
  severity: number;
  resultTypes: AnomalyResultType[];
  timeRange: string;
}

interface Props {
  alertParams: MlAnomalyThresholdAlertParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

const MlAlertThresholdAlertTrigger: FC<Props> = ({
  alertParams,
  setAlertParams,
  setAlertProperty,
}) => {
  const {
    services: { http },
  } = useMlKibana();
  const adJobsApiService = jobsApiProvider(new HttpService(http));

  const onAlertParamChange = useCallback(
    (param) => (update: any) => {
      setAlertParams(param, update);
    },
    []
  );

  return (
    <>
      <JobSelectorControl
        jobSelection={alertParams.jobSelection}
        adJobsApiService={adJobsApiService}
        onSelectionChange={onAlertParamChange('jobSelection')}
      />
      <ResultTypeSelector
        value={alertParams.resultTypes}
        onChange={onAlertParamChange('resultTypes')}
      />
      <SeveritySelector value={alertParams.severity} onChange={onAlertParamChange('severity')} />
      <IntervalSelector value={alertParams.timeRange} onChange={onAlertParamChange('timeRange')} />
    </>
  );
};

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MlAlertThresholdAlertTrigger;
