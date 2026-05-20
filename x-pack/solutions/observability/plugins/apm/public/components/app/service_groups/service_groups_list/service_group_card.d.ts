import React from 'react';
import type { ServiceGroup } from '../../../../../common/service_groups';
interface Props {
    serviceGroup: ServiceGroup;
    href?: string;
    serviceGroupCounts?: {
        services: number;
        alerts: number;
    };
    isLoading: boolean;
}
export declare function ServiceGroupsCard({ serviceGroup, href, serviceGroupCounts, isLoading }: Props): React.JSX.Element;
export {};
