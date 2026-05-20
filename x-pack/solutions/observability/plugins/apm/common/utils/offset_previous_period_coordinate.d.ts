import type { Coordinate } from '../../typings/timeseries';
export declare function offsetPreviousPeriodCoordinates({ currentPeriodTimeseries, previousPeriodTimeseries, }: {
    currentPeriodTimeseries?: Coordinate[];
    previousPeriodTimeseries?: Coordinate[];
}): Coordinate[];
