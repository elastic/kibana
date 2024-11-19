/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqueId } from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { asyncForEach } from '@kbn/std';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../utils/kibana_react';
import {
  ALERT_APP,
  APM_APP,
  INFRA_LOGS_APP,
  INFRA_METRICS_APP,
  UNIVERSAL_PROFILING_APP,
  UPTIME_APP,
  UX_APP,
} from '../constants';
import { getDataHandler } from './data_handler';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { getObservabilityAlerts } from './get_observability_alerts';
import { ObservabilityFetchDataPlugins } from '../../typings/fetch_overview_data';
import { ApmIndicesConfig } from '../../../common/typings';

export type DataContextApps = ObservabilityFetchDataPlugins | 'alert';

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
  UNIVERSAL_PROFILING_APP,
];

export const appLabels: Record<DataContextApps, string> = {
  alert: i18n.translate('xpack.observability.overview.alertsLabel', {
    defaultMessage: 'Alerts',
  }),
  apm: i18n.translate('xpack.observability.overview.apmLabel', {
    defaultMessage: 'APM',
  }),
  infra_logs: i18n.translate('xpack.observability.overview.logsLabel', {
    defaultMessage: 'Logs',
  }),
  infra_metrics: i18n.translate('xpack.observability.overview.metricsLabel', {
    defaultMessage: 'Metrics',
  }),
  universal_profiling: i18n.translate('xpack.observability.overview.profilingLabel', {
    defaultMessage: 'Profiling',
  }),
  uptime: i18n.translate('xpack.observability.overview.uptimeLabel', {
    defaultMessage: 'Uptime',
  }),
  ux: i18n.translate('xpack.observability.overview.uxLabel', {
    defaultMessage: 'UX',
  }),
};

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const { http } = useKibana().services;
  const [forceUpdate, setForceUpdate] = useState('');
  const { absoluteStart, absoluteEnd } = useDatePickerContext();

  const [hasDataMap, setHasDataMap] = useState<HasDataContextValue['hasDataMap']>({});

  useEffect(
    () => {
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
            case UX_APP:
              const params = { absoluteTime: { start: absoluteStart!, end: absoluteEnd! } };
              const resultUx = await getDataHandler(app)?.hasData(params);
              updateState({
                hasData: resultUx?.hasData,
                indices: resultUx?.indices,
                serviceName: resultUx?.serviceName as string,
              });
              break;
            case UPTIME_APP:
              const resultSy = await getDataHandler(app)?.hasData();
              updateState({ hasData: resultSy?.hasData, indices: resultSy?.indices });

              break;
            case APM_APP:
              const resultApm = await getDataHandler(app)?.hasData();
              updateState({ hasData: resultApm?.hasData, indices: resultApm?.indices });

              break;
            case INFRA_LOGS_APP:
              const resultInfraLogs = await getDataHandler(app)?.hasData();
              updateState({
                hasData: resultInfraLogs?.hasData,
                indices: resultInfraLogs?.indices,
              });
              break;
            case INFRA_METRICS_APP:
              const resultInfraMetrics = await getDataHandler(app)?.hasData();
              updateState({
                hasData: resultInfraMetrics?.hasData,
                indices: resultInfraMetrics?.indices,
              });
              break;
            case UNIVERSAL_PROFILING_APP:
              // Profiling only shows the empty section for now
              updateState({ hasData: false });
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
    []
  );

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
