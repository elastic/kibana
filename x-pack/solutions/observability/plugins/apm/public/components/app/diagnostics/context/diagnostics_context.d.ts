import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;
export declare const DiagnosticsContext: React.Context<{
    diagnosticsBundle?: DiagnosticsBundle;
    setImportedDiagnosticsBundle: (bundle: DiagnosticsBundle | undefined) => void;
    status: FETCH_STATUS;
    isImported?: boolean;
    refetch: () => void;
}>;
export declare function DiagnosticsContextProvider({ children }: {
    children: React.ReactChild;
}): React.JSX.Element;
export {};
