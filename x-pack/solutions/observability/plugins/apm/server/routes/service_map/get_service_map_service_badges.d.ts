import type { ServiceAlertsResponse } from '../services/get_services/get_service_alerts';
import type { ServiceSloStatsResponse } from '../services/get_services/get_services_slo_stats';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import type { ApmSloClient } from '../../lib/helpers/get_apm_slo_client';
export interface ServiceMapServiceBadgesResponse {
    alerts: ServiceAlertsResponse;
    slos: ServiceSloStatsResponse;
}
export declare function getServiceMapServiceBadges({ serviceNames, environment, start, end, kuery, apmAlertsClient, sloClient, }: {
    serviceNames: string[];
    environment: string;
    start: number;
    end: number;
    kuery?: string;
    apmAlertsClient?: ApmAlertsClient;
    sloClient?: ApmSloClient;
}): Promise<ServiceMapServiceBadgesResponse>;
