import React from 'react';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
export interface SyncBadgeProps {
    /**
     * Is the request synchronous? True will show blocking, false will show async.
     */
    sync?: boolean;
    agentName?: AgentName;
}
export declare function getSyncLabel(agentName?: AgentName, sync?: boolean): string | undefined;
export declare function SyncBadge({ sync, agentName }: SyncBadgeProps): React.JSX.Element | null;
