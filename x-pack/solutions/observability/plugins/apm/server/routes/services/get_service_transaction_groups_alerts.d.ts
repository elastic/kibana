import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
export type ServiceTransactionGroupAlertsResponse = Array<{
    name: string;
    alertsCount: number;
}>;
export declare function getServiceTransactionGroupsAlerts({ apmAlertsClient, kuery, transactionType, serviceName, latencyAggregationType, start, end, environment, searchQuery, }: {
    apmAlertsClient: ApmAlertsClient;
    kuery?: string;
    serviceName?: string;
    transactionType?: string;
    latencyAggregationType: LatencyAggregationType;
    start: number;
    end: number;
    environment?: string;
    searchQuery?: string;
}): Promise<ServiceTransactionGroupAlertsResponse>;
