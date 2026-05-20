import type { XYBrushEvent } from '@elastic/charts';
import React from 'react';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { DurationDistributionChartData } from '../duration_distribution_chart';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
export declare function getFormattedSelection(selection: [number, number]): string;
export declare const MIN_TAB_TITLE_HEIGHT = 56;
export declare function DurationDistributionChartWithScrubber({ onClearSelection, onChartSelection, selection, status, markerCurrentEvent, percentileThresholdValue, chartData, totalDocCount, hasData, eventType, }: {
    onClearSelection: () => void;
    onChartSelection: (event: XYBrushEvent) => void;
    selection?: [number, number];
    status: FETCH_STATUS;
    markerCurrentEvent?: number;
    percentileThresholdValue?: number | null;
    chartData: DurationDistributionChartData[];
    hasData: boolean;
    eventType: ProcessorEvent.transaction | ProcessorEvent.span;
    totalDocCount?: number;
}): React.JSX.Element;
