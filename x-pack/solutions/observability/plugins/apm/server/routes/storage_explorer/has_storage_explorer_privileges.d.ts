import type { ApmPluginRequestHandlerContext } from '../typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function hasStorageExplorerPrivileges({ context, apmEventClient, }: {
    context: ApmPluginRequestHandlerContext;
    apmEventClient: APMEventClient;
}): Promise<boolean>;
