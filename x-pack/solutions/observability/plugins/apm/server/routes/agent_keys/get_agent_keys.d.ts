import type { ApiKey } from '@kbn/security-plugin-types-common';
import type { ApmPluginRequestHandlerContext } from '../typings';
export interface AgentKeysResponse {
    agentKeys: ApiKey[];
}
export declare function getAgentKeys({ context, }: {
    context: ApmPluginRequestHandlerContext;
}): Promise<AgentKeysResponse>;
