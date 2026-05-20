import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export interface SloAlertsClient {
    alertsClient: AlertsClient;
    sloAlertsIndices: string[];
}
export declare function getSloAlertsClient({ plugins, request, }: Pick<MinimalAPMRouteHandlerResources, 'plugins' | 'request'>): Promise<SloAlertsClient | undefined>;
