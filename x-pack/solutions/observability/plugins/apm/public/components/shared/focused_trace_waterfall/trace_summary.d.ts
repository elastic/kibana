import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type TraceSummary = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/summary'>['summary'];
interface Props {
    summary: TraceSummary;
}
export declare function TraceSummary({ summary }: Props): React.JSX.Element;
export {};
