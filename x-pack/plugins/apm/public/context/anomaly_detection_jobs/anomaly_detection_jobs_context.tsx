/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, useState } from 'react';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { APIReturnType } from '../../services/rest/createCallApmApi';

export interface AnomalyDetectionJobsContextValue {
  anomalyDetectionJobsData?: APIReturnType<'GET /api/apm/settings/anomaly-detection/jobs'>;
  anomalyDetectionJobsStatus: FETCH_STATUS;
  anomalyDetectionJobsRefetch: () => void;
}

export const AnomalyDetectionJobsContext = createContext(
  {} as AnomalyDetectionJobsContextValue
);

export function AnomalyDetectionJobsContextProvider({
  children,
}: {
  children: ReactChild;
}) {
  const [fetchId, setFetchId] = useState(0);
  const refetch = () => setFetchId((id) => id + 1);

  const { data, status } = useFetcher(
    (callApmApi) =>
      callApmApi({
        endpoint: `GET /api/apm/settings/anomaly-detection/jobs`,
      }),
    [fetchId], // eslint-disable-line react-hooks/exhaustive-deps
    { showToastOnError: false }
  );

  return (
    <AnomalyDetectionJobsContext.Provider
      value={{
        anomalyDetectionJobsData: data,
        anomalyDetectionJobsStatus: status,
        anomalyDetectionJobsRefetch: refetch,
      }}
    >
      {children}
    </AnomalyDetectionJobsContext.Provider>
  );
}
