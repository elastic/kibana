import type { AlertStatus } from '@kbn/rule-data-utils';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceMapEdge as ServiceMapEdgeType, ServiceMapNode, ServiceNodeData } from '../../../../common/service_map';
/**
 * Connection-based filter values.
 * - `orphaned`: show only nodes with 0 edges (no connections at all).
 * - `connected`: show only nodes with ≥1 edge.
 */
export type ConnectionFilter = 'orphaned' | 'connected';
export interface ServiceMapViewFilters {
    /** Empty = show all alert statuses. If non-empty, service must have ≥1 alert in any selected status. */
    alertStatusFilter: AlertStatus[];
    sloStatusFilter: SloStatus[];
    /** Empty = show all. If non-empty, service must match at least one selected connection filter (OR). */
    connectionFilter: ConnectionFilter[];
    /** Empty = show all. If non-empty, service ML severity (from anomaly score) must match one of the selected bands. */
    anomalySeverityFilter: ML_ANOMALY_SEVERITY[];
}
export declare const DEFAULT_SERVICE_MAP_VIEW_FILTERS: ServiceMapViewFilters;
/** Builds a Set of node IDs that appear on at least one edge (as source or target). */
export declare function buildConnectedNodeIdSet(edges: ServiceMapEdgeType[]): Set<string>;
/**
 * SLO bucket for map filters and option counts: `undefined` or `noSLOs` (no SLO summary on the node)
 * is treated as **`noData`** so tallies and combo options stay aligned with `SloStatus`.
 */
export declare function getNormalizedSloStatusForMapFilters(data: ServiceNodeData): SloStatus;
/** Alert count for a status on one service (used by filters and filter-option counts). */
export declare function getServiceNodeAlertCountForStatus(data: ServiceNodeData, status: AlertStatus): number;
/** ML severity band for map filters, derived from the same score → severity rules as service inventory. */
export declare function getMlSeverityForServiceMapNode(data: ServiceNodeData): ML_ANOMALY_SEVERITY;
/**
 * Applies client-side visibility for service map nodes and edges. Service nodes must match all
 * active filters. Dependency and grouped nodes are shown when connected to any visible node;
 * non-matching services are never pulled in through dependencies.
 */
export declare function applyServiceMapVisibility(nodes: ServiceMapNode[], edges: ServiceMapEdgeType[], filters: ServiceMapViewFilters): {
    nodes: ServiceMapNode[];
    edges: ServiceMapEdgeType[];
};
