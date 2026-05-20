import type { Coordinate } from '../../../../../typings/timeseries';
export type BarSeriesDataMap = Record<string, Coordinate[]>;
type BarSeriesData = Array<{
    name: string;
    data: Coordinate[];
}>;
export declare const getFilteredBarSeries: (barSeries: BarSeriesData) => {
    name: string;
    data: Coordinate[];
}[];
export {};
