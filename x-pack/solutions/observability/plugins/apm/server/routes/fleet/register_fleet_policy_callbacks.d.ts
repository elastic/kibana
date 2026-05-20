import type { Logger, CoreStart } from '@kbn/core/server';
import type { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
export declare function registerFleetPolicyCallbacks({ logger, coreStartPromise, plugins, }: {
    logger: Logger;
    coreStartPromise: Promise<CoreStart>;
    plugins: APMRouteHandlerResources['plugins'];
}): Promise<void>;
