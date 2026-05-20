import React from 'react';
import type { MergedServiceDashboard } from '..';
export declare function EditDashboard({ onRefresh, currentDashboard, serviceName, }: {
    onRefresh: () => void;
    currentDashboard: MergedServiceDashboard;
    serviceName: string;
}): React.JSX.Element;
