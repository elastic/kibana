/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PendingActions } from '../../../../common/components/endpoint/host_isolation';
import type { ImmutableObject, PendingActionsResponse } from '../../../../../common/endpoint/types';

export const usePendingActionsStatuses = (
  pendingActions?: PendingActionsResponse | ImmutableObject<PendingActionsResponse>,
  agentId?: string
): { pendingActions: PendingActions } => {
  const pendingActionRequests = useMemo(() => {
    const pending = pendingActions?.data?.filter((action) => action.agent_id === agentId)[0]
      ?.pending_actions;

    return {
      pendingActions: {
        pendingIsolate: pending?.isolate ?? 0,
        pendingUnIsolate: pending?.unisolate ?? 0,
        pendingKillProcess: pending?.['kill-process'] ?? 0,
        pendingSuspendProcess: pending?.['suspend-process'] ?? 0,
        pendingRunningProcesses: pending?.['running-processes'] ?? 0,
        pendingGetFile: pending?.['get-file'] ?? 0,
        pendingExecute: pending?.execute ?? 0,
      },
    };
  }, [pendingActions, agentId]);

  return pendingActionRequests;
};
