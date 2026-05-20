import React from 'react';
import type { ServiceMapDiagnosticResponse } from '../../../../../common/service_map_diagnostic_types';
export declare function DiagnosticResults({ data, sourceNode, destinationNode, traceId, }: {
    data: ServiceMapDiagnosticResponse;
    sourceNode?: string;
    destinationNode?: string;
    traceId?: string;
}): React.JSX.Element | null;
