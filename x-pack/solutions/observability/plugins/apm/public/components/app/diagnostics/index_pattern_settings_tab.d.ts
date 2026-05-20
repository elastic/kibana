import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;
export declare function DiagnosticsIndexPatternSettings(): React.JSX.Element;
export declare function getIsIndexPatternTabOk(diagnosticsBundle?: DiagnosticsBundle): boolean;
export {};
