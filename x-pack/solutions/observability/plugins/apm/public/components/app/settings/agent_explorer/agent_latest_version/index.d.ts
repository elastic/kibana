import React from 'react';
import type { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';
export declare function AgentLatestVersion({ agentName, isLoading, latestVersion, failed, }: {
    agentName: AgentName;
    isLoading: boolean;
    latestVersion?: string;
    failed: boolean;
}): React.JSX.Element;
