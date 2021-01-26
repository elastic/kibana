/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback } from 'react';
import { JobSelectorControl, JobSelectorControlProps } from './job_selector';
import { useMlKibana } from '../application/contexts/kibana';
import { jobsApiProvider } from '../application/services/ml_api_service/jobs';
import { HttpService } from '../application/services/http_service';
import { SeveritySelector, SeveritySelectorProps } from './severity_selector';

interface MlAnomalyThresholdAlertParams {
  jobSelection: {
    jobIds?: string[];
    groupIds?: string[];
  };
  severity: number;
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

  const onJobSelectionChange: JobSelectorControlProps['onSelectionChange'] = useCallback(
    (update) => {
      setAlertParams('jobSelection', update);
    },
    []
  );

  const onSeverityChange: SeveritySelectorProps['onChange'] = useCallback((update) => {
    setAlertParams('severity', update);
  }, []);

  return (
    <>
      <JobSelectorControl
        jobSelection={alertParams.jobSelection}
        adJobsApiService={adJobsApiService}
        onSelectionChange={onJobSelectionChange}
      />
      <SeveritySelector value={alertParams.severity} onChange={onSeverityChange} />
    </>
  );
};

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MlAlertThresholdAlertTrigger;
