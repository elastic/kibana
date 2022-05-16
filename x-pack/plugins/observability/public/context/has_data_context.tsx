/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqueId } from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { lastValueFrom } from 'rxjs';
import { asyncForEach } from '@kbn/std';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getDataHandler } from '../data_handler';
import { FETCH_STATUS } from '../hooks/use_fetcher';
import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';
import { ApmIndicesConfig } from '../../common/typings';
import { ObservabilityAppServices } from '../application/types';
import { useAlertIndexNames } from '../hooks/use_alert_index_names';

type DataContextApps = ObservabilityFetchDataPlugins | 'alert';

export type HasDataMap = Record<
  DataContextApps,
  {
    status: FETCH_STATUS;
    hasData?: boolean;
    indices?: string | ApmIndicesConfig;
    serviceName?: string;
  }
>;

export interface HasDataContextValue {
  hasDataMap: Partial<HasDataMap>;
  hasAnyData?: boolean;
  isAllRequestsComplete: boolean;
  onRefreshTimeRange: () => void;
  forceUpdate: string;
}

export const HasDataContext = createContext({} as HasDataContextValue);

const apps: DataContextApps[] = ['apm', 'synthetics', 'infra_logs', 'infra_metrics', 'ux', 'alert'];

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { data } = useKibana<ObservabilityAppServices>().services;
  const [forceUpdate, setForceUpdate] = useState('');
  const { absoluteStart, absoluteEnd } = useDatePickerContext();

  const alertIndices = useAlertIndexNames();

  const [hasDataMap, setHasDataMap] = useState<HasDataContextValue['hasDataMap']>({});

  const isExploratoryView = useRouteMatch('/exploratory-view');

  useEffect(
    () => {
      if (!isExploratoryView)
        asyncForEach(apps, async (app) => {
          try {
            const updateState = ({
              hasData,
              indices,
              serviceName,
            }: {
              hasData?: boolean;
              serviceName?: string;
              indices?: string | ApmIndicesConfig;
            }) => {
              setHasDataMap((prevState) => ({
                ...prevState,
                [app]: {
                  hasData,
                  ...(serviceName ? { serviceName } : {}),
                  ...(indices ? { indices } : {}),
                  status: FETCH_STATUS.SUCCESS,
                },
              }));
            };
            switch (app) {
              case 'ux':
                const params = { absoluteTime: { start: absoluteStart!, end: absoluteEnd! } };
                const resultUx = await getDataHandler(app)?.hasData(params);
                updateState({
                  hasData: resultUx?.hasData,
                  indices: resultUx?.indices,
                  serviceName: resultUx?.serviceName as string,
                });
                break;
              case 'synthetics':
                const resultSy = await getDataHandler(app)?.hasData();
                updateState({ hasData: resultSy?.hasData, indices: resultSy?.indices });

                break;
              case 'apm':
                const resultApm = await getDataHandler(app)?.hasData();
                updateState({ hasData: resultApm?.hasData, indices: resultApm?.indices });

                break;
              case 'infra_logs':
                const resultInfraLogs = await getDataHandler(app)?.hasData();
                updateState({
                  hasData: resultInfraLogs?.hasData,
                  indices: resultInfraLogs?.indices,
                });
                break;
              case 'infra_metrics':
                const resultInfraMetrics = await getDataHandler(app)?.hasData();
                updateState({
                  hasData: resultInfraMetrics?.hasData,
                  indices: resultInfraMetrics?.indices,
                });
                break;
              case 'alert':
                const alerts = await lastValueFrom(
                  data.search.search({
                    params: {
                      index: alertIndices,
                      ignore_unavailable: true,
                      allow_no_indices: true,
                      size: 0,
                      terminate_after: 1,
                      track_total_hits: 1,
                    },
                  })
                );
                const hasAlerts = (alerts?.rawResponse.hits.total ?? 0) > 0;
                updateState({ hasData: hasAlerts });
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
    [isExploratoryView, alertIndices]
  );

  const isAllRequestsComplete = apps.every((app) => {
    const appStatus = hasDataMap[app]?.status;
    return appStatus !== undefined && appStatus !== FETCH_STATUS.LOADING;
  });

  const hasAnyData = (Object.keys(hasDataMap) as ObservabilityFetchDataPlugins[]).some((app) => {
    const appHasData = hasDataMap[app]?.hasData;
    return appHasData === true;
  });

  return (
    <HasDataContext.Provider
      value={{
        hasDataMap,
        hasAnyData: isEmpty(hasDataMap) ? undefined : hasAnyData,
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
