import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;
export declare function FieldMappingStatus(): React.JSX.Element;
export declare function getIsIndicesTabOk(diagnosticsBundle?: DiagnosticsBundle): boolean;
export {};
