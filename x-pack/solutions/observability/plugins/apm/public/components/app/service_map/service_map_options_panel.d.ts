import React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceMapNode } from '../../../../common/service_map';
import type { ConnectionFilter } from './apply_service_map_visibility';
import type { ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
export type ServiceMapOrientation = 'horizontal' | 'vertical';
export interface ServiceMapOptionsPanelToggleProps {
    isExpanded: boolean;
    onExpandedChange: (next: boolean) => void;
}
export interface ServiceMapOptionsPanelProps {
    nodes: ServiceMapNode[];
    filterOptionCounts: ServiceMapFilterOptionCounts;
    connectionFilter: ConnectionFilter[];
    onConnectionFilterChange: (next: ConnectionFilter[]) => void;
    alertStatusFilter: AlertStatus[];
    onAlertStatusFilterChange: (next: AlertStatus[]) => void;
    sloStatusFilter: SloStatus[];
    onSloStatusFilterChange: (next: SloStatus[]) => void;
    anomalySeverityFilter: ML_ANOMALY_SEVERITY[];
    onAnomalySeverityFilterChange: (next: ML_ANOMALY_SEVERITY[]) => void;
    mapOrientation: ServiceMapOrientation;
    onMapOrientationChange: (next: ServiceMapOrientation) => void;
}
export declare function ServiceMapOptionsPanelToggle({ isExpanded, onExpandedChange, }: ServiceMapOptionsPanelToggleProps): React.JSX.Element;
export declare function ServiceMapOptionsPanel({ nodes, filterOptionCounts, connectionFilter, onConnectionFilterChange, alertStatusFilter, onAlertStatusFilterChange, sloStatusFilter, onSloStatusFilterChange, anomalySeverityFilter, onAnomalySeverityFilterChange, mapOrientation, onMapOrientationChange, }: ServiceMapOptionsPanelProps): React.JSX.Element;
