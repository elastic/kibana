import React from 'react';
import type { TabContentProps } from '.';
declare function DevicesTab({ environment, kuery, start, end, comparisonEnabled, offset, }: TabContentProps): React.JSX.Element;
export declare const devicesTab: {
    dataTestSubj: string;
    key: string;
    label: string;
    component: typeof DevicesTab;
};
export {};
