/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqueId } from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ALERT_APP,
  APM_APP,
  INFRA_LOGS_APP,
  INFRA_METRICS_APP,
  UPTIME_APP,
  UX_APP,
} from './constants';
import { FETCH_STATUS } from '../hooks/use_fetcher';
import { getObservabilityAlerts } from '../services/get_observability_alerts';
import { ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';
import { ApmIndicesConfig } from '../../common/typings';
import { ObservabilityAppServices } from '../application/types';

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

const apps: DataContextApps[] = [
  APM_APP,
  UPTIME_APP,
  INFRA_LOGS_APP,
  INFRA_METRICS_APP,
  UX_APP,
  ALERT_APP,
];

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const [forceUpdate, setForceUpdate] = useState('');

  const [hasDataMap, setHasDataMap] = useState<HasDataContextValue['hasDataMap']>({});

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const alerts = await getObservabilityAlerts({ http });
        setHasDataMap((prevState) => ({
          ...prevState,
          [ALERT_APP]: {
            hasData: alerts.length > 0,
            status: FETCH_STATUS.SUCCESS,
          },
        }));
      } catch (e) {
        setHasDataMap((prevState) => ({
          ...prevState,
          [ALERT_APP]: {
            hasData: undefined,
            status: FETCH_STATUS.FAILURE,
          },
        }));
      }
    }

    fetchAlerts();
  }, [forceUpdate, http]);

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
