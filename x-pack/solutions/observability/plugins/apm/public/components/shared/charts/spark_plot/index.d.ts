import React from 'react';
import type { Coordinate } from '../../../../../typings/timeseries';
type SparkPlotType = 'line' | 'bar';
export declare function SparkPlot({ type, color, isLoading, series, comparisonSeries, valueLabel, compact, comparisonSeriesColor, }: {
    type?: SparkPlotType;
    color: string;
    isLoading: boolean;
    series?: Coordinate[] | null;
    valueLabel: React.ReactNode;
    compact?: boolean;
    comparisonSeries?: Coordinate[];
    comparisonSeriesColor?: string;
}): React.JSX.Element;
export declare function SparkPlotItem({ type, color, isLoading, series, comparisonSeries, comparisonSeriesColor, compact, }: {
    type?: SparkPlotType;
    color: string;
    isLoading: boolean;
    series?: Coordinate[] | null;
    compact?: boolean;
    comparisonSeries?: Coordinate[];
    comparisonSeriesColor?: string;
}): React.JSX.Element;
export {};
