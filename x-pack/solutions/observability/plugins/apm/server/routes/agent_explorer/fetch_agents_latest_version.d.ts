import type { Logger } from '@kbn/core/server';
import type { ElasticApmAgentLatestVersion, OtelAgentLatestVersion } from '../../../common/agent_explorer';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
export interface AgentLatestVersionsResponse {
    data: AgentLatestVersions;
    error?: {
        message: string;
        type?: string;
        statusCode?: string;
    };
}
type AgentLatestVersions = Record<AgentName, ElasticApmAgentLatestVersion | OtelAgentLatestVersion>;
export declare const fetchAgentsLatestVersion: (logger: Logger, latestAgentVersionsUrl: string) => Promise<AgentLatestVersionsResponse>;
export {};
