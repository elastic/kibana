import type { APMEventClient } from './create_es_client/create_apm_event_client';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export declare function getApmEventClient({ context, core, params, getApmIndices, request, }: Pick<MinimalAPMRouteHandlerResources, 'context' | 'core' | 'params' | 'getApmIndices' | 'request'>): Promise<APMEventClient>;
