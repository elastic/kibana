/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export const DiagnosticsContext = React.createContext<{
  diagnosticsBundle?: DiagnosticsBundle;
  setUploadedDiagnosticsBundle: (bundle: DiagnosticsBundle | undefined) => void;
  status: FETCH_STATUS;
  isUploaded?: boolean;
  refetch: () => void;
}>({
  diagnosticsBundle: undefined,
  setUploadedDiagnosticsBundle: () => undefined,
  status: FETCH_STATUS.NOT_INITIATED,
  refetch: () => undefined,
});

export function DiagnosticsContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { data, status, refetch } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics`);
  }, []);

  const [uploadedDiagnosticsBundle, setUploadedDiagnosticsBundle] = useState<
    DiagnosticsBundle | undefined
  >(undefined);

  const value = useMemo(() => {
    if (uploadedDiagnosticsBundle) {
      return {
        refetch,
        diagnosticsBundle: uploadedDiagnosticsBundle,
        setUploadedDiagnosticsBundle,
        status: FETCH_STATUS.SUCCESS,
        isUploaded: true,
      };
    }

    return {
      refetch,
      diagnosticsBundle: data,
      setUploadedDiagnosticsBundle,
      status,
      isUploaded: false,
    };
  }, [
    uploadedDiagnosticsBundle,
    setUploadedDiagnosticsBundle,
    status,
    data,
    refetch,
  ]);

  return <DiagnosticsContext.Provider value={value} children={children} />;
}
