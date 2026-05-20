import React from 'react';
import type { ExitSpanFields } from '../../../../../common/service_map_diagnostic_types';
interface ExitSpansAnalysisProps {
    hasMatchingDestinationResources: boolean;
    totalConnections: number;
    apmExitSpans: ExitSpanFields[];
    destinationNode: string;
    sourceNode: string;
}
export declare function ExitSpansAnalysis({ hasMatchingDestinationResources, totalConnections, apmExitSpans, destinationNode, sourceNode, }: ExitSpansAnalysisProps): React.JSX.Element;
export {};
