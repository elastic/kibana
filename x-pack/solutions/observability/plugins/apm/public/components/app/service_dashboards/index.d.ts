import React from 'react';
import type { SavedApmCustomDashboard } from '../../../../common/custom_dashboards';
export interface MergedServiceDashboard extends SavedApmCustomDashboard {
    title: string;
}
export declare function ServiceDashboards(): React.JSX.Element;
