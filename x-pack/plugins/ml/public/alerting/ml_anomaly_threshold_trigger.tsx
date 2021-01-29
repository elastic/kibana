/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { JobSelectorControl } from './job_selector';
import { useMlKibana } from '../application/contexts/kibana';
import { jobsApiProvider } from '../application/services/ml_api_service/jobs';
import { HttpService } from '../application/services/http_service';
import { SeveritySelector } from './severity_selector';
import { ResultTypeSelector } from './result_type_selector';
import type { AnomalyResultType } from '../../common/types/anomalies';
import { alertingApiProvider } from '../application/services/ml_api_service/alerting';
import { PreviewAlertCondition } from './preview_alert_condition';

export interface MlAnomalyThresholdAlertParams {
  jobSelection: {
    jobIds?: string[];
    groupIds?: string[];
  };
  severity: number;
  resultType: AnomalyResultType;
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
  const mlHttpService = useMemo(() => new HttpService(http), [http]);
  const adJobsApiService = jobsApiProvider(mlHttpService);
  const alertingApiService = alertingApiProvider(mlHttpService);

  const onAlertParamChange = useCallback(
    <T extends keyof MlAnomalyThresholdAlertParams>(param: T) => (
      update: MlAnomalyThresholdAlertParams[T]
    ) => {
      setAlertParams(param, update);
    },
    []
  );

  return (
    <>
      <JobSelectorControl
        jobSelection={alertParams.jobSelection}
        adJobsApiService={adJobsApiService}
        onSelectionChange={useCallback(onAlertParamChange('jobSelection'), [])}
      />
      <ResultTypeSelector
        value={alertParams.resultType}
        onChange={useCallback(onAlertParamChange('resultType'), [])}
      />
      <SeveritySelector
        value={alertParams.severity}
        onChange={useCallback(onAlertParamChange('severity'), [])}
      />
      <PreviewAlertCondition alertingApiService={alertingApiService} alertParams={alertParams} />

      <EuiSpacer size="m" />
    </>
  );
};

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MlAlertThresholdAlertTrigger;
