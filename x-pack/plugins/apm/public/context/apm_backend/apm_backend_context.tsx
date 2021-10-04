/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo } from 'react';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { useApmParams } from '../../hooks/use_apm_params';
import { APIReturnType } from '../../services/rest/createCallApmApi';
import { useTimeRange } from '../../hooks/use_time_range';

export const ApmBackendContext = createContext<
  | {
      backendName: string;
      metadata: {
        data?: APIReturnType<'GET /api/apm/backends/{backendName}/metadata'>;
        status?: FETCH_STATUS;
      };
    }
  | undefined
>(undefined);

export function ApmBackendContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    path: { backendName },
    query: { rangeFrom, rangeTo },
  } = useApmParams('/backends/{backendName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const backendMetadataFetch = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/backends/{backendName}/metadata',
        params: {
          path: {
            backendName,
          },
          query: {
            start,
            end,
          },
        },
      });
    },
    [backendName, start, end]
  );

  const value = useMemo(() => {
    return {
      backendName,
      metadata: {
        data: backendMetadataFetch.data,
        status: backendMetadataFetch.status,
      },
    };
  }, [backendName, backendMetadataFetch.data, backendMetadataFetch.status]);

  return (
    <ApmBackendContext.Provider value={value}>
      {children}
    </ApmBackendContext.Provider>
  );
}
