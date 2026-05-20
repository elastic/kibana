import type { SloClient } from '@kbn/slo-plugin/server';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export type ApmSloClient = SloClient;
export declare function getApmSloClient({ plugins, request, }: Pick<MinimalAPMRouteHandlerResources, 'plugins' | 'request'>): Promise<ApmSloClient | undefined>;
