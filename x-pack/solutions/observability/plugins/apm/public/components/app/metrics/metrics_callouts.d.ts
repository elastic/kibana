import React from 'react';
import type { IngestionTimeRanges } from '../../../../common/metrics_types';
export declare function NoDataForRangeCallout(): React.JSX.Element;
export declare function NoDashboardFoundCallout(): React.JSX.Element;
export type IngestionType = 'classicApm' | 'otelNative';
interface MixedAgentCalloutProps {
    ingestionTimeRanges?: IngestionTimeRanges;
    forcedIngestionType?: IngestionType | null;
    onNavigateToIngestionType?: (type: IngestionType) => void;
}
export declare function MixedAgentCallout({ ingestionTimeRanges, forcedIngestionType, onNavigateToIngestionType, }: MixedAgentCalloutProps): React.JSX.Element | null;
export {};
