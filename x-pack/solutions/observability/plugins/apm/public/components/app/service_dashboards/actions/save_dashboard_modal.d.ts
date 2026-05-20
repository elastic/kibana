import React from 'react';
import type { MergedServiceDashboard } from '..';
interface Props {
    onClose: () => void;
    onRefresh: () => void;
    currentDashboard?: MergedServiceDashboard;
    serviceDashboards?: MergedServiceDashboard[];
    serviceName: string;
}
export declare function SaveDashboardModal({ onClose, onRefresh, currentDashboard, serviceDashboards, serviceName, }: Props): React.JSX.Element;
export {};
