import React from 'react';
import type { BrushEndListener } from '@elastic/charts';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { HistogramItem } from '../../../../../common/correlations/types';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
export interface DurationDistributionChartData {
    id: string;
    histogram: HistogramItem[];
    areaSeriesColor: string;
}
interface DurationDistributionChartProps {
    data: DurationDistributionChartData[];
    hasData: boolean;
    markerCurrentEvent?: number;
    markerValue: number;
    onChartSelection?: BrushEndListener;
    selection?: [number, number];
    status: FETCH_STATUS;
    eventType: ProcessorEvent.span | ProcessorEvent.transaction;
}
export declare const replaceHistogramZerosWithMinimumDomainValue: (histogramItems: HistogramItem[]) => HistogramItem[];
export declare function DurationDistributionChart({ data, hasData, markerCurrentEvent, markerValue, onChartSelection, selection, status, eventType, }: DurationDistributionChartProps): React.JSX.Element;
export {};
