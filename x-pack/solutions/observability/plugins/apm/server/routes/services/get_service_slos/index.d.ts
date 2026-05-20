import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { ApmSloClient } from '../../../lib/helpers/get_apm_slo_client';
import type { SloAlertsClient } from '../../../lib/helpers/get_slo_alerts_client';
export interface StatusCounts {
    violated: number;
    degrading: number;
    healthy: number;
    noData: number;
}
export interface ServiceSlosResponse {
    results: SLOWithSummaryResponse[];
    total: number;
    page: number;
    perPage: number;
    activeAlerts: Record<string, number>;
    statusCounts: StatusCounts;
}
export declare function getServiceSlos({ sloClient, sloAlertsClient, serviceName, environment, statusFilters, kqlQuery, page, perPage, }: {
    sloClient?: ApmSloClient;
    sloAlertsClient?: SloAlertsClient;
    serviceName: string;
    environment?: string;
    statusFilters?: string[];
    kqlQuery?: string;
    page: number;
    perPage: number;
}): Promise<ServiceSlosResponse>;
