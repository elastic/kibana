/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniqueId } from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { Alert } from '../../../alerts/common';
import { getDataHandler } from '../data_handler';
import { FETCH_STATUS } from '../hooks/use_fetcher';
import { usePluginContext } from '../hooks/use_plugin_context';
import { useTimeRange } from '../hooks/use_time_range';
import { getObservabilityAlerts } from '../services/get_observability_alerts';
import { ObservabilityFetchDataPlugins, UXHasDataResponse } from '../typings/fetch_overview_data';

type DataContextApps = ObservabilityFetchDataPlugins | 'alert';

export type HasDataMap = Record<
  DataContextApps,
  { status: FETCH_STATUS; hasData?: boolean | UXHasDataResponse | Alert[] }
>;

export interface HasDataContextValue {
  hasData: Partial<HasDataMap>;
  hasAnyData: boolean;
  isAllRequestsComplete: boolean;
  onRefreshTimeRange: () => void;
  forceUpdate: string;
}

export const HasDataContext = createContext({} as HasDataContextValue);

const apps: DataContextApps[] = ['apm', 'uptime', 'infra_logs', 'infra_metrics', 'ux', 'alert'];

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { core } = usePluginContext();
  const [forceUpdate, setForceUpdate] = useState('');
  const { absoluteStart, absoluteEnd } = useTimeRange();

  const [hasData, setHasData] = useState<HasDataContextValue['hasData']>({});

  useEffect(
    () => {
      apps.forEach(async (app) => {
        try {
          if (app !== 'alert') {
            const params =
              app === 'ux'
                ? { absoluteTime: { start: absoluteStart, end: absoluteEnd } }
                : undefined;

            const result = await getDataHandler(app)?.hasData(params);
            setHasData((prevState) => ({
              ...prevState,
              [app]: {
                hasData: result,
                status: FETCH_STATUS.SUCCESS,
              },
            }));
          }
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const alerts = await getObservabilityAlerts({ core });
        setHasData((prevState) => ({
          ...prevState,
          alert: {
            hasData: alerts,
            status: FETCH_STATUS.SUCCESS,
          },
        }));
      } catch (e) {
        setHasData((prevState) => ({
          ...prevState,
          alert: {
            hasData: undefined,
            status: FETCH_STATUS.FAILURE,
          },
        }));
      }
    }

    fetchAlerts();
  }, [forceUpdate, core]);

  const isAllRequestsComplete = apps.every((app) => {
    const appStatus = hasData[app]?.status;
    return appStatus !== undefined && appStatus !== FETCH_STATUS.LOADING;
  });

  const hasAnyData = (Object.keys(hasData) as ObservabilityFetchDataPlugins[]).some(
    (app) => hasData[app]?.hasData === true
  );

  return (
    <HasDataContext.Provider
      value={{
        hasData,
        hasAnyData,
        isAllRequestsComplete,
        forceUpdate,
        onRefreshTimeRange: () => {
          setForceUpdate(uniqueId());
        },
      }}
      children={children}
    />
  );
}
