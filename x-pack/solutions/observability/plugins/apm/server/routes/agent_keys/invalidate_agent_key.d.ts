import type { ApmPluginRequestHandlerContext } from '../typings';
export interface InvalidateAgentKeyResponse {
    invalidatedAgentKeys: string[];
}
export declare function invalidateAgentKey({ context, id, isAdmin, }: {
    context: ApmPluginRequestHandlerContext;
    id: string;
    isAdmin: boolean;
}): Promise<InvalidateAgentKeyResponse>;
