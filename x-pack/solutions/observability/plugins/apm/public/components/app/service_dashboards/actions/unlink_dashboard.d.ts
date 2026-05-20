import React from 'react';
import type { MergedServiceDashboard } from '..';
export declare function UnlinkDashboard({ currentDashboard, defaultDashboard, onRefresh, }: {
    currentDashboard: MergedServiceDashboard;
    defaultDashboard: MergedServiceDashboard;
    onRefresh: () => void;
}): React.JSX.Element;
