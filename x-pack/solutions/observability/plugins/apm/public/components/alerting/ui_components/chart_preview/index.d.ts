import type { TickFormatter } from '@elastic/charts';
import React from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimeUnitChar } from '@kbn/observability-plugin/common';
import type { Coordinate } from '../../../../../typings/timeseries';
interface ChartPreviewProps {
    yTickFormat?: TickFormatter;
    threshold: number;
    uiSettings?: IUiSettingsClient;
    series: Array<{
        name?: string;
        data: Coordinate[];
    }>;
    timeSize?: number;
    timeUnit?: TimeUnitChar;
    totalGroups: number;
}
export declare function ChartPreview({ yTickFormat, threshold, uiSettings, series, timeSize, timeUnit, totalGroups, }: ChartPreviewProps): React.JSX.Element;
export {};
