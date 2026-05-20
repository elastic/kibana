import React from 'react';
import type { TabContentProps } from '.';
declare function TransactionsTab({ environment, kuery, start, end }: TabContentProps): React.JSX.Element;
export declare const transactionsTab: {
    dataTestSubj: string;
    key: string;
    label: string;
    component: typeof TransactionsTab;
};
export {};
