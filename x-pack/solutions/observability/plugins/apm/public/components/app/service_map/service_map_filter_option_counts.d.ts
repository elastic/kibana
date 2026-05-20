import type { AlertStatus } from '@kbn/rule-data-utils';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
export interface ConnectionCounts {
    orphaned: number;
    connected: number;
}
export interface ServiceMapFilterOptionCounts {
    alerts: Record<AlertStatus, number>;
    slo: Record<SloStatus, number>;
    anomaly: Record<ML_ANOMALY_SEVERITY, number>;
    connection: ConnectionCounts;
    totalServiceNodes: number;
}
/**
 * Aggregates per-status service counts from the **unfiltered** map nodes
 * so filter options can show count badges.
 */
export declare function computeServiceMapFilterOptionCounts(nodes: ServiceMapNode[], edges: ServiceMapEdge[]): ServiceMapFilterOptionCounts;
