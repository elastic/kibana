import React from 'react';
import type { TabContentProps } from '.';
declare function OSVersionTab({ environment, kuery, start, end, comparisonEnabled, offset, }: TabContentProps): React.JSX.Element;
export declare const osVersionTab: {
    dataTestSubj: string;
    key: string;
    label: string;
    component: typeof OSVersionTab;
};
export {};
