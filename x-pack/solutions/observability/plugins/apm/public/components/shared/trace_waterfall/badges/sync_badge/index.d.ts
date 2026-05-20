import React from 'react';
import type { AgentName } from '@kbn/apm-types/es_schemas_ui';
export interface SyncBadgeProps {
    /**
     * Whether the span was executed synchronously or asynchronously.
     * - `true`: Synchronous execution (may show "blocking" badge)
     * - `false`: Asynchronous execution (may show "async" badge)
     * - `undefined`: Unknown or not applicable (no badge shown)
     */
    sync?: boolean;
    /**
     * The APM agent name (e.g., 'nodejs', 'python', 'java').
     * Used to determine if the sync/async behavior is meaningful for this agent.
     * - `undefined`: Unknown agent, typically for unprocessed OTEL documents (no badge shown)
     */
    agentName?: AgentName;
}
/**
 * Determines the appropriate label for the sync badge based on agent and sync value.
 *
 * @param agentName - The APM agent name
 * @param sync - Whether the span is synchronous
 * @returns The label to display, or undefined if no badge should be shown
 *
 * Returns undefined (no badge) when:
 * - Either parameter is undefined (common for unprocessed OTEL documents)
 * - The sync value doesn't match the agent's expected behavior (mismatch)
 */
export declare function getSyncLabel(agentName?: AgentName, sync?: boolean): string | undefined;
export declare function SyncBadge({ sync, agentName }: SyncBadgeProps): React.JSX.Element | null;
