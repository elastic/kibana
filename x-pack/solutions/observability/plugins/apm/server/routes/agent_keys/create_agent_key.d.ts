import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ApmPluginRequestHandlerContext } from '../typings';
export interface CreateAgentKeyResponse {
    agentKey: SecurityCreateApiKeyResponse;
}
export declare function createAgentKey({ context, requestBody, }: {
    context: ApmPluginRequestHandlerContext;
    requestBody: {
        name: string;
        privileges: string[];
    };
}): Promise<{
    agentKey: SecurityCreateApiKeyResponse;
}>;
