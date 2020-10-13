/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { getDataHandler } from '../data_handler';
import { FETCH_STATUS } from '../hooks/use_fetcher';
import { useRouteParams } from '../hooks/use_route_params';
import { useTimeRange } from '../hooks/use_time_range';
import { ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';

type HasDataMap = Record<
  ObservabilityFetchDataPlugins,
  { status: FETCH_STATUS; hasData?: boolean }
>;

export interface HasDataContextValue {
  hasData: Partial<HasDataMap>;
  hasAnyData: boolean | undefined;
}

export const HasDataContext = createContext({} as HasDataContextValue);

const apps: ObservabilityFetchDataPlugins[] = [
  'apm',
  'uptime',
  'infra_logs',
  'infra_metrics',
  'ux',
];

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { rangeFrom, rangeTo } = useRouteParams('/overview').query;
  const { absStart, absEnd } = useTimeRange({ rangeFrom, rangeTo });

  const [hasData, setHasData] = useState<HasDataContextValue['hasData']>({});

  useEffect(() => {
    apps.forEach(async (app) => {
      try {
        const params =
          app === 'ux' ? { absoluteTime: { start: absStart, end: absEnd } } : undefined;

        const result = await getDataHandler(app)?.hasData(params);
        setHasData((prevState) => ({
          ...prevState,
          [app]: {
            hasData: result,
            status: FETCH_STATUS.SUCCESS,
          },
        }));
      } catch (e) {
        setHasData((prevState) => ({
          ...prevState,
          [app]: {
            hasData: undefined,
            status: FETCH_STATUS.FAILURE,
          },
        }));
      }
    });
  }, [absStart, absEnd]);

  const allRequestCompleted = isEmpty(hasData)
    ? false
    : Object.values(hasData).every((dataContext) => dataContext?.status !== FETCH_STATUS.LOADING);

  const hasSomeData = (Object.keys(hasData) as ObservabilityFetchDataPlugins[]).some(
    (app) => hasData[app]?.hasData === true
  );

  let hasAnyData;
  if (hasSomeData === true) {
    hasAnyData = true;
    // Waits until all requests are complete to set hasAnyData to false
  } else if (hasSomeData === false && allRequestCompleted === true) {
    hasAnyData = false;
  }

  return <HasDataContext.Provider value={{ hasData, hasAnyData }} children={children} />;
}
