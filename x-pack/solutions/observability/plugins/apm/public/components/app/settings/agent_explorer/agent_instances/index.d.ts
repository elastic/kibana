import React from 'react';
import type { AgentExplorerItem } from '../agent_list';
interface Props {
    agent: AgentExplorerItem;
    isLatestVersionsLoading: boolean;
    latestVersionsFailed: boolean;
    onClose: () => void;
}
export declare function AgentInstances({ agent, isLatestVersionsLoading, latestVersionsFailed, onClose, }: Props): React.JSX.Element;
export {};
