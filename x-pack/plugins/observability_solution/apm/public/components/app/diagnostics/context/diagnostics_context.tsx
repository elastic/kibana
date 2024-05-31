/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export const DiagnosticsContext = React.createContext<{
  diagnosticsBundle?: DiagnosticsBundle;
  setImportedDiagnosticsBundle: (bundle: DiagnosticsBundle | undefined) => void;
  status: FETCH_STATUS;
  isImported?: boolean;
  refetch: () => void;
}>({
  diagnosticsBundle: undefined,
  setImportedDiagnosticsBundle: () => undefined,
  status: FETCH_STATUS.NOT_INITIATED,
  refetch: () => undefined,
});

export function DiagnosticsContextProvider({ children }: { children: React.ReactChild }) {
  const {
    query: { kuery, rangeFrom, rangeTo },
  } = useApmParams('/diagnostics/*');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });
  const { data, status, refetch } = useFetcher(
    (callApmApi) => {
      return callApmApi(`GET /internal/apm/diagnostics`, {
        isCachable: false,
        params: {
          query: {
            start,
            end,
            kuery,
          },
        },
      });
    },
    [start, end, kuery]
  );

  const [importedDiagnosticsBundle, setImportedDiagnosticsBundle] = useState<
    DiagnosticsBundle | undefined
  >(undefined);

  const value = useMemo(() => {
    if (importedDiagnosticsBundle) {
      return {
        refetch,
        diagnosticsBundle: importedDiagnosticsBundle,
        setImportedDiagnosticsBundle,
        status: FETCH_STATUS.SUCCESS,
        isImported: true,
      };
    }

    return {
      refetch,
      diagnosticsBundle: data,
      setImportedDiagnosticsBundle,
      status,
      isImported: false,
    };
  }, [importedDiagnosticsBundle, setImportedDiagnosticsBundle, status, data, refetch]);

  return <DiagnosticsContext.Provider value={value} children={children} />;
}
