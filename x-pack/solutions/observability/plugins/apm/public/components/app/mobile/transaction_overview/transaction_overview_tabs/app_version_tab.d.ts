import React from 'react';
import type { TabContentProps } from '.';
declare function AppVersionTab({ environment, kuery, start, end, comparisonEnabled, offset, }: TabContentProps): React.JSX.Element;
export declare const appVersionTab: {
    dataTestSubj: string;
    key: string;
    label: string;
    component: typeof AppVersionTab;
};
export {};
