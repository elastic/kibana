import React from 'react';
import type { ServiceMapDiagnosticResponse } from '../../../../../common/service_map_diagnostic_types';
interface TraceCorrelationAnalysisProps {
    traceCorrelation: ServiceMapDiagnosticResponse['analysis']['traceCorrelation'];
    traceId?: string;
    sourceNode: string;
    destinationNode: string;
}
export declare function TraceCorrelationAnalysis({ traceCorrelation, traceId, sourceNode, destinationNode, }: TraceCorrelationAnalysisProps): React.JSX.Element | null;
export {};
