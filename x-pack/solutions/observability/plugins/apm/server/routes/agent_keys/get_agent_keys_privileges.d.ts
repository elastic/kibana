import type { CoreStart } from '@kbn/core/server';
import type { ApmPluginRequestHandlerContext } from '../typings';
export interface AgentKeysPrivilegesResponse {
    areApiKeysEnabled: boolean;
    isAdmin: boolean;
    canManage: boolean;
}
export declare function getAgentKeysPrivileges({ context, coreStart, }: {
    context: ApmPluginRequestHandlerContext;
    coreStart: CoreStart;
}): Promise<AgentKeysPrivilegesResponse>;
