/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEnvironmentsContext } from '../environments_context/use_environments_context';
import { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import { useAnyOfApmParams } from '../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { useTimeRange } from '../../hooks/use_time_range';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../apm_service/use_apm_service_context';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { useLicenseContext } from '../license/use_license_context';

export const ServiceAnomalyTimeseriesContext = React.createContext<{
  status: FETCH_STATUS;
  allAnomalyTimeseries: ServiceAnomalyTimeseries[];
}>({
  status: FETCH_STATUS.NOT_INITIATED,
  allAnomalyTimeseries: [],
});

export function ServiceAnomalyTimeseriesContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { serviceName, transactionType } = useApmServiceContext();

  const { core } = useApmPluginContext();

  const license = useLicenseContext();

  const mlCapabilities = core.application.capabilities.ml as { canGetJobs: boolean } | undefined;

  const canGetAnomalies = mlCapabilities?.canGetJobs && isActivePlatinumLicense(license);

  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}',
    '/mobile-services/{serviceName}',
    '/logs-services/{serviceName}'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { preferredEnvironment } = useEnvironmentsContext();

  const { status, data } = useFetcher(
    (callApmApi) => {
      if (!transactionType || !canGetAnomalies) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/anomaly_charts', {
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            transactionType,
            environment: preferredEnvironment,
          },
        },
      });
    },
    [serviceName, canGetAnomalies, transactionType, start, end, preferredEnvironment]
  );

  return (
    <ServiceAnomalyTimeseriesContext.Provider
      value={{
        status,
        allAnomalyTimeseries: data?.allAnomalyTimeseries ?? [],
      }}
    >
      {children}
    </ServiceAnomalyTimeseriesContext.Provider>
  );
}
