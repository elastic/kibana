import type { ApmDataAccessServices, APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export declare function getApmDataAccessServices({ apmEventClient, plugins, }: {
    apmEventClient: APMEventClient;
} & Pick<MinimalAPMRouteHandlerResources, 'plugins'>): Promise<ApmDataAccessServices>;
