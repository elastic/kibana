/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueId } from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { Alert } from '../../../alerting/common';
import { getDataHandler } from '../data_handler';
import { FETCH_STATUS } from '../hooks/use_fetcher';
import { usePluginContext } from '../hooks/use_plugin_context';
import { useTimeRange } from '../hooks/use_time_range';
import { getObservabilityAlerts } from '../services/get_observability_alerts';
import { ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';
import { ApmIndicesConfig } from '../../common/typings';

type DataContextApps = ObservabilityFetchDataPlugins | 'alert';

export type HasDataMap = Record<
  DataContextApps,
  {
    status: FETCH_STATUS;
    hasData?: boolean | Alert[];
    indices?: string | ApmIndicesConfig;
  }
>;

export interface HasDataContextValue {
  hasDataMap: Partial<HasDataMap>;
  hasAnyData: boolean;
  isAllRequestsComplete: boolean;
  onRefreshTimeRange: () => void;
  forceUpdate: string;
}

export const HasDataContext = createContext({} as HasDataContextValue);

const apps: DataContextApps[] = ['apm', 'synthetics', 'infra_logs', 'infra_metrics', 'ux', 'alert'];

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { core } = usePluginContext();
  const [forceUpdate, setForceUpdate] = useState('');
  const { absoluteStart, absoluteEnd } = useTimeRange();

  const [hasDataMap, setHasDataMap] = useState<HasDataContextValue['hasDataMap']>({});

  const isExploratoryView = useRouteMatch('/exploratory-view');

  useEffect(
    () => {
      if (!isExploratoryView)
        apps.forEach(async (app) => {
          try {
            const updateState = (hasData?: boolean) => {
              setHasDataMap((prevState) => ({
                ...prevState,
                [app]: {
                  hasData,
                  status: FETCH_STATUS.SUCCESS,
                },
              }));
            };
            switch (app) {
              case 'ux':
                const params = { absoluteTime: { start: absoluteStart, end: absoluteEnd } };
                const resultUx = await getDataHandler(app)?.hasData(params);
                updateState(resultUx?.hasData);
                break;
              case 'synthetics':
                const resultSy = await getDataHandler(app)?.hasData();
                updateState(resultSy?.hasData);

                break;
              case 'apm':
                const resultApm = await getDataHandler(app)?.hasData();
                updateState(resultApm?.hasData);

                break;
              case 'infra_logs':
              case 'infra_metrics':
                const resultInfra = await getDataHandler(app)?.hasData();
                updateState(resultInfra);
                break;
            }
          } catch (e) {
            setHasDataMap((prevState) => ({
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
    [isExploratoryView]
  );

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const alerts = await getObservabilityAlerts({ core });
        setHasDataMap((prevState) => ({
          ...prevState,
          alert: {
            hasData: alerts,
            status: FETCH_STATUS.SUCCESS,
          },
        }));
      } catch (e) {
        setHasDataMap((prevState) => ({
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
    const appStatus = hasDataMap[app]?.status;
    return appStatus !== undefined && appStatus !== FETCH_STATUS.LOADING;
  });

  const hasAnyData = (Object.keys(hasDataMap) as ObservabilityFetchDataPlugins[]).some(
    (app) => hasDataMap[app]?.hasData === true
  );

  return (
    <HasDataContext.Provider
      value={{
        hasDataMap,
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
