import React from 'react';
import type { IWaterfallLegend } from '../../../../common/waterfall/legend';
import type { WaterfallLegendType } from '../../../../common/waterfall/legend';
interface Props {
    serviceName?: string;
    legends: IWaterfallLegend[];
    type: WaterfallLegendType;
}
export declare function WaterfallLegends({ serviceName, legends, type }: Props): React.JSX.Element;
export {};
