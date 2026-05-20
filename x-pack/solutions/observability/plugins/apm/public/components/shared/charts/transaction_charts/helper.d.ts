import type { Coordinate } from '../../../../../typings/timeseries';
import type { TimeFormatter } from '../../../../../common/utils/formatters';
export declare function getResponseTimeTickFormatter(formatter: TimeFormatter): (t: number) => string;
export declare function getMaxY(specs?: Array<{
    data: Coordinate[];
}>): number;
