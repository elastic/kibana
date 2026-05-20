import React from 'react';
import type { Coordinate } from '../../../../../typings/timeseries';
export declare const TIME_LABELS: {
    s: string;
    m: string;
    h: string;
    d: string;
};
export declare const getDomain: (series: Array<{
    name?: string;
    data: Coordinate[];
}>) => {
    xMax: number;
    xMin: number;
    yMax: number;
    yMin: number;
};
export declare function NoDataState(): React.JSX.Element;
export declare function LoadingState(): React.JSX.Element;
export declare function ErrorState(): React.JSX.Element;
interface PreviewChartLabel {
    lookback: number;
    timeLabel: string;
    displayedGroups: number;
    totalGroups: number;
}
export declare function TimeLabelForData({ lookback, timeLabel, displayedGroups, totalGroups, }: PreviewChartLabel): React.JSX.Element;
export {};
