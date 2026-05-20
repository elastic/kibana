import type { EuiPageHeaderProps } from '@elastic/eui';
import React from 'react';
import type { ServerlessType } from '../../../../../common/serverless';
export type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
    key: 'overview' | 'transactions' | 'dependencies' | 'errors' | 'metrics' | 'nodes' | 'infrastructure' | 'service-map' | 'logs' | 'alerts' | 'profiling' | 'dashboards';
    hidden?: boolean;
};
export declare function isMetricsTabHidden({ agentName, serverlessType, }: {
    agentName?: string;
    serverlessType?: ServerlessType;
}): boolean;
export declare function isInfraTabHidden({ agentName, serverlessType, isInfraTabAvailable, }: {
    agentName?: string;
    serverlessType?: ServerlessType;
    isInfraTabAvailable: boolean;
}): boolean;
export declare function useTabs({ selectedTab }: {
    selectedTab: Tab['key'];
}): {
    href: string | undefined;
    label: React.ReactNode;
    prepend: React.ReactNode;
    append: React.ReactNode;
    isSelected: boolean;
    'data-test-subj': string;
}[];
