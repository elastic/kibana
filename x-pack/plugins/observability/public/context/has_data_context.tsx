/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useEffect, useState } from 'react';
import { getDataHandler } from '../data_handler';
import { useFetcher } from '../hooks/use_fetcher';
import { useRouteParams } from '../hooks/use_route_params';
import { useTimeRange } from '../hooks/use_time_range';
import {
  ObservabilityFetchDataPlugins,
  ObservabilityHasDataResponse,
} from '../typings/fetch_overview_data';

export interface HasDataContextValue {
  hasData: Partial<ObservabilityHasDataResponse> | undefined;
  hasAnyData: boolean | undefined;
}

export const HasDataContext = createContext({} as HasDataContextValue);

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { rangeFrom, rangeTo } = useRouteParams('/overview').query;
  const { absStart, absEnd } = useTimeRange({ rangeFrom, rangeTo });

  const [hasData, setHasData] = useState<HasDataContextValue['hasData']>();

  const { data: hasApmData, status: apmStatus } = useFetcher(
    () => getDataHandler('apm')?.hasData(),
    []
  );
  useEffect(() => {
    setHasData((currState) => ({ ...currState, apm: hasApmData }));
  }, [hasApmData]);

  const { data: hasLogsData, status: logsStatus } = useFetcher(
    () => getDataHandler('infra_logs')?.hasData(),
    []
  );
  useEffect(() => {
    setHasData((currState) => ({ ...currState, infra_logs: hasLogsData }));
  }, [hasLogsData]);

  const { data: hasMetricsData, status: metricsStatus } = useFetcher(
    () => getDataHandler('infra_metrics')?.hasData(),
    []
  );
  useEffect(() => {
    setHasData((currState) => ({ ...currState, infra_metrics: hasMetricsData }));
  }, [hasMetricsData]);

  const { data: hasUptimeData, status: uptimeStatus } = useFetcher(
    () => getDataHandler('uptime')?.hasData(),
    []
  );
  useEffect(() => {
    setHasData((currState) => ({ ...currState, uptime: hasUptimeData }));
  }, [hasUptimeData]);

  const { data: hasUxData, status: uxStatus } = useFetcher(
    () => getDataHandler('ux')?.hasData({ absoluteTime: { start: absStart, end: absEnd } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    setHasData((currState) => ({ ...currState, ux: hasUxData }));
  }, [hasUxData]);

  const allRequestCompleted =
    apmStatus !== 'loading' &&
    logsStatus !== 'loading' &&
    metricsStatus !== 'loading' &&
    uptimeStatus !== 'loading' &&
    uxStatus !== 'loading';

  const hasSomeData =
    hasData &&
    (Object.keys(hasData) as ObservabilityFetchDataPlugins[]).some((app) => {
      const _hasData = app === 'ux' ? hasData[app]?.hasData : hasData[app];
      return _hasData === true;
    });

  // When hasSomeData is false, checks if all request have complete, if they do, hasAnyData is set to false;
  let hasAnyData;
  if (hasSomeData !== undefined) {
    if (hasSomeData === false) {
      if (allRequestCompleted === true) {
        hasAnyData = false;
      }
    } else {
      hasAnyData = true;
    }
  }

  return <HasDataContext.Provider value={{ hasData, hasAnyData }} children={children} />;
}
