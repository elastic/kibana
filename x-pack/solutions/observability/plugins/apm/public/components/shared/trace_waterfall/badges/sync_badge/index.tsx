/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AgentName } from '@kbn/apm-types/es_schemas_ui';
import { getAgentSyncValue } from './helper';

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

const BLOCKING_LABEL = i18n.translate('xpack.apm.traceWaterfall.syncBadgeBlocking', {
  defaultMessage: 'blocking',
});

const ASYNC_LABEL = i18n.translate('xpack.apm.traceWaterfall.syncBadgeAsync', {
  defaultMessage: 'async',
});

const TOOLTIP_CONTENT = i18n.translate('xpack.apm.traceWaterfall.syncBadgeTooltip', {
  defaultMessage: 'Indicates whether the span was executed synchronously or asynchronously.',
});

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
export function getSyncLabel(agentName?: AgentName, sync?: boolean) {
  if (sync === undefined || agentName === undefined) {
    return;
  }

  const agentSyncValue = getAgentSyncValue(agentName);
  if (agentSyncValue === undefined) {
    return;
  }

  if (sync && agentSyncValue) {
    return BLOCKING_LABEL;
  }

  if (!sync && !agentSyncValue) {
    return ASYNC_LABEL;
  }
}

export function SyncBadge({ sync, agentName }: SyncBadgeProps) {
  const syncLabel = getSyncLabel(agentName, sync);
  if (!syncLabel) {
    return null;
  }

  return (
    <EuiToolTip content={TOOLTIP_CONTENT}>
      <EuiBadge tabIndex={0}>{syncLabel}</EuiBadge>
    </EuiToolTip>
  );
}
