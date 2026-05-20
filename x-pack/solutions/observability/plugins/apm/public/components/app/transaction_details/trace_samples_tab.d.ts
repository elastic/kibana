import React from 'react';
import type { TabContentProps } from './transaction_details_tabs';
declare function TraceSamplesTab({ selectSampleFromChartSelection, clearChartSelection, sampleRangeFrom, sampleRangeTo, traceSamplesFetchResult, }: TabContentProps): React.JSX.Element;
export declare const traceSamplesTab: {
    dataTestSubj: string;
    key: string;
    label: string;
    component: typeof TraceSamplesTab;
};
export {};
