/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useEffect, useState } from 'react';
import { getDataHandler } from '../data_handler';
import { useQueryParams } from '../hooks/use_query_params';
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
  const { absStart, absEnd } = useQueryParams();
  const [hasData, setHasData] = useState<HasDataContextValue['hasData']>();

  useEffect(
    () => {
      getDataHandler('apm')
        ?.hasData()
        .then((hasApmData) => {
          setHasData((currState) => ({ ...currState, apm: hasApmData }));
        });
      getDataHandler('infra_logs')
        ?.hasData()
        .then((hasInfraData) => {
          setHasData((currState) => ({ ...currState, infra_logs: hasInfraData }));
        });
      getDataHandler('infra_metrics')
        ?.hasData()
        .then((hasMetricsData) => {
          setHasData((currState) => ({ ...currState, infra_metrics: hasMetricsData }));
        });
      getDataHandler('uptime')
        ?.hasData()
        .then((hasUptimeData) => {
          setHasData((currState) => ({ ...currState, uptime: hasUptimeData }));
        });
      getDataHandler('ux')
        ?.hasData({ absoluteTime: { start: absStart, end: absEnd } })
        .then((hasUxData) => {
          setHasData((currState) => ({ ...currState, ux: hasUxData }));
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const hasAnyData =
    hasData &&
    (Object.keys(hasData) as ObservabilityFetchDataPlugins[]).some((app) => {
      const _hasData = app === 'ux' ? hasData[app]?.hasData : hasData[app];
      return _hasData === true;
    });

  return <HasDataContext.Provider value={{ hasData, hasAnyData }} children={children} />;
}
