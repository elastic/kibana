import type { ApmSloClient } from '../../../lib/helpers/get_apm_slo_client';
import type { SloStatus } from '../../../../common/service_inventory';
export type SloSummary = Record<SloStatus, number>;
export type ServiceSloStatsResponse = Array<{
    serviceName: string;
    sloStatus: SloStatus;
    sloCount: number;
}>;
export declare function getServicesSloStats({ sloClient, environment, maxNumServices, serviceNames, }: {
    sloClient?: ApmSloClient;
    maxNumServices?: number;
    environment: string;
    serviceNames?: string[];
}): Promise<ServiceSloStatsResponse>;
export declare function getWorstSloStatus(summary: SloSummary): {
    sloStatus: SloStatus;
    sloCount: number;
};
