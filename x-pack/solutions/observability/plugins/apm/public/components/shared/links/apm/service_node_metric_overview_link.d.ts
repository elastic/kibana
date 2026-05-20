import React from 'react';
import type { APMLinkExtendProps } from './apm_link_hooks';
interface Props extends APMLinkExtendProps {
    serviceName: string;
    serviceNodeName: string;
}
export declare function useServiceNodeMetricOverviewHref({ serviceName, serviceNodeName, }: {
    serviceName: string;
    serviceNodeName: string;
}): string;
export declare function ServiceNodeMetricOverviewLink({ serviceName, serviceNodeName, ...rest }: Props): React.JSX.Element;
export {};
