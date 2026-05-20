import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;
export declare function DataStreamsStatus(): React.JSX.Element;
export declare function getIsDataStreamTabOk(diagnosticsBundle?: DiagnosticsBundle): boolean;
export {};
