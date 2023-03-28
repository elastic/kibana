/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getPendingActions } from '../../../../common/components/endpoint/host_isolation/utils';
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
      pendingActions: getPendingActions(pending),
    };
  }, [pendingActions, agentId]);

  return pendingActionRequests;
};
