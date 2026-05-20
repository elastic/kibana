import React from 'react';
import type { MergedServiceDashboard } from '..';
export declare function LinkDashboard({ onRefresh, emptyButton, serviceDashboards, serviceName, }: {
    onRefresh: () => void;
    emptyButton?: boolean;
    serviceDashboards?: MergedServiceDashboard[];
    serviceName: string;
}): React.JSX.Element;
