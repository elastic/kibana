import React from 'react';
export interface TabContentProps {
    agentName?: string;
    environment: string;
    start: string;
    end: string;
    kuery: string;
    comparisonEnabled: boolean;
    offset?: string;
    mobileSelectedTab?: string;
}
export declare function TransactionOverviewTabs({ agentName, environment, start, end, kuery, comparisonEnabled, offset, mobileSelectedTab, }: TabContentProps): React.JSX.Element;
