import React from 'react';
import type { Annotation } from '../../../../../common/annotations';
import type { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
interface Props {
    fetchStatus: FETCH_STATUS;
    height?: number;
    showAnnotations: boolean;
    annotations: Annotation[];
    timeseries?: Array<TimeSeries<Coordinate>>;
    yAxisType: 'duration' | 'percentage';
    id?: string;
}
export declare function BreakdownChart({ fetchStatus, height, showAnnotations, annotations, timeseries, yAxisType, id, }: Props): React.JSX.Element;
export {};
