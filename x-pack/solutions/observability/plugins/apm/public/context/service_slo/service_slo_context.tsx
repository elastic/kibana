/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { createContext, useMemo } from 'react';
import type { SloStatus } from '../../../common/service_inventory';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';

const SLO_STATUS_PRIORITY: SloStatus[] = ['violated', 'degrading', 'noData', 'healthy'];

export interface MostCriticalSloStatus {
  status: SloStatus | 'noSLOs';
  count: number;
}

export interface ServiceSloContextValue {
  sloFetchStatus: FETCH_STATUS;
  hasSlos: boolean;
  mostCriticalSloStatus: MostCriticalSloStatus;
}

export const ServiceSloContext = createContext<ServiceSloContextValue>({
  sloFetchStatus: FETCH_STATUS.NOT_INITIATED,
  hasSlos: false,
  mostCriticalSloStatus: { status: 'noSLOs', count: 0 },
});

export function ServiceSloContextProvider({
  serviceName,
  environment,
  children,
}: {
  serviceName: string;
  environment: string;
  children: ReactNode;
}) {
  const { core } = useApmPluginContext();
  const canReadSlos = !!core.application.capabilities.slo?.read;

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!canReadSlos) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/slos', {
        params: {
          path: { serviceName },
          query: {
            environment,
            page: 0,
            perPage: 1,
          },
        },
      });
    },
    [serviceName, environment, canReadSlos]
  );

  const sloTotal = data?.total ?? 0;
  const hasSlos = sloTotal > 0;

  const mostCriticalSloStatus = useMemo<MostCriticalSloStatus>(() => {
    const statusCounts = data?.statusCounts;
    if (hasSlos && statusCounts) {
      for (const priority of SLO_STATUS_PRIORITY) {
        const count = statusCounts[priority] ?? 0;
        if (count > 0) {
          return { status: priority, count };
        }
      }
    }
    return { status: 'noSLOs', count: 0 };
  }, [data?.statusCounts, hasSlos]);

  return (
    <ServiceSloContext.Provider
      value={{
        sloFetchStatus: status,
        hasSlos,
        mostCriticalSloStatus,
      }}
      children={children}
    />
  );
}
