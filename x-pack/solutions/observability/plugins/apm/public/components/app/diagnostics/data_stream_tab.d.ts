import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;
export declare function DiagnosticsDataStreams(): React.JSX.Element;
export declare function getIndexTemplateState(diagnosticsBundle: DiagnosticsBundle, templateName: string): {
    name: string;
    isNonStandard: boolean;
    exists: boolean;
} | undefined;
export {};
