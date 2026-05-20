import type { ServiceGroup } from '../../../../common/service_groups';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
export type ServiceAlertsResponse = Array<{
    serviceName: string;
    alertsCount: number;
}>;
export declare function getServicesAlerts({ apmAlertsClient, kuery, maxNumServices, serviceGroup, serviceName, serviceNames, start, end, environment, searchQuery, }: {
    apmAlertsClient: ApmAlertsClient;
    kuery?: string;
    maxNumServices?: number;
    serviceGroup?: ServiceGroup | null;
    serviceName?: string;
    /** When set, restricts results to these service names (e.g. service map nodes). */
    serviceNames?: string[];
    start: number;
    end: number;
    environment?: string;
    searchQuery?: string;
}): Promise<ServiceAlertsResponse>;
