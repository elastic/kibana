import type { ServiceListItem } from '../../../../../common/service_inventory';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
/**
 * Determines the default sort field based on available data in service items.
 * Priority: alertsCount -> sloStatus -> anomalyScore -> throughput
 */
export declare function getAvailableFields(items: ServiceListItem[]): {
    hasAlerts: boolean;
    hasSlos: boolean;
    hasAnomalyScores: boolean;
    sortField: ServiceInventoryFieldName;
};
export declare function orderServiceItems({ items, sortField, sortDirection, isDefaultSort, }: {
    items: ServiceListItem[];
    sortField: ServiceInventoryFieldName;
    sortDirection: 'asc' | 'desc';
    isDefaultSort?: boolean;
}): ServiceListItem[];
