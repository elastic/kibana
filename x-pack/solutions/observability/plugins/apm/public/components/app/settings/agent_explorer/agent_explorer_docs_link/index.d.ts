import React from 'react';
import type { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';
interface AgentExplorerDocsLinkProps {
    agentName: AgentName;
    repositoryUrl?: string;
}
export declare function AgentExplorerDocsLink({ agentName, repositoryUrl }: AgentExplorerDocsLinkProps): React.JSX.Element;
export {};
