import type { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import type { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';
import type { ApmRoutes } from '../../../../../routing/apm_route_config';
export declare function AgentContextualInformation({ agentName, serviceName, agentDocsPageUrl, instances, latestVersion, query, isLatestVersionsLoading, latestVersionsFailed, }: {
    agentName: AgentName;
    serviceName: string;
    agentDocsPageUrl?: string;
    instances: number;
    latestVersion?: string;
    query: TypeOf<ApmRoutes, '/settings/agent-explorer'>['query'];
    isLatestVersionsLoading: boolean;
    latestVersionsFailed: boolean;
}): React.JSX.Element;
