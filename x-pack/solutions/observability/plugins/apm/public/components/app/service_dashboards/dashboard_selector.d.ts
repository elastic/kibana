import React from 'react';
import type { MergedServiceDashboard } from '.';
interface Props {
    serviceDashboards: MergedServiceDashboard[];
    currentDashboardId?: string;
    setCurrentDashboard: (newDashboard: MergedServiceDashboard) => void;
}
export declare function DashboardSelector({ serviceDashboards, currentDashboardId, setCurrentDashboard, }: Props): React.JSX.Element;
export {};
