import type { XYBrushEvent } from '@elastic/charts';
import type { History } from 'history';
import type { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
export declare const onBrushEnd: ({ x, history }: {
    x: XYBrushEvent["x"];
    history: History;
}) => void;
export declare function isTimeseriesEmpty(timeseries?: Array<TimeSeries<Coordinate>>): boolean;
