import React from 'react';
import type { ValuesType } from 'utility-types';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import type { ITableColumn } from '../../../../shared/managed_table';
export type AgentExplorerItem = ValuesType<APIReturnType<'GET /internal/apm/get_agents_per_service'>['items']>;
export declare function getAgentsColumns({ selectedAgent, isLatestVersionsLoading, latestAgentVersionEnabled, latestVersionsFailed, onAgentSelected, }: {
    selectedAgent?: AgentExplorerItem;
    isLatestVersionsLoading: boolean;
    latestAgentVersionEnabled: boolean;
    latestVersionsFailed: boolean;
    onAgentSelected: (agent: AgentExplorerItem) => void;
}): Array<ITableColumn<AgentExplorerItem>>;
interface Props {
    items: AgentExplorerItem[];
    noItemsMessage: React.ReactNode;
    isLoading: boolean;
    isLatestVersionsLoading: boolean;
    latestVersionsFailed: boolean;
}
export declare function AgentList({ items, noItemsMessage, isLoading, isLatestVersionsLoading, latestVersionsFailed, }: Props): React.JSX.Element;
export {};
