import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceAnomalyScoresResponse } from './get_service_anomaly_scores';
import type { ServiceAlertsResponse } from './get_service_alerts';
import type { ServiceSloStatsResponse } from './get_services_slo_stats';
import type { ServiceTransactionStatsResponse } from './get_service_transaction_stats';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
export interface MergedServiceStat {
    serviceName: string;
    transactionType?: string;
    environments?: string[];
    agentName?: AgentName;
    latency?: number | null;
    transactionErrorRate?: number;
    throughput?: number;
    anomalyScore?: number;
    alertsCount?: number;
    sloStatus?: SloStatus;
    sloCount?: number;
}
export declare function mergeServiceStats({ serviceStats, anomalyScores, alertCounts, sloStats, }: {
    serviceStats: ServiceTransactionStatsResponse['serviceStats'];
    anomalyScores: ServiceAnomalyScoresResponse;
    alertCounts: ServiceAlertsResponse;
    sloStats: ServiceSloStatsResponse;
}): MergedServiceStat[];
