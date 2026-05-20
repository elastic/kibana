import type { ChartType, YUnit } from '../../../typings/timeseries';
export interface ChartBase {
    title: string;
    key: string;
    type: ChartType;
    yUnit: YUnit;
    series: {
        [key: string]: {
            title: string;
            color?: string;
        };
    };
    description?: string;
}
