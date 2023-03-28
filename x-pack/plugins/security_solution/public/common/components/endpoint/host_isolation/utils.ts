/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointPendingActions } from '../../../../../common/endpoint/types';
import type { PendingActions } from './endpoint_host_isolation_status';

export const getPendingActions = (
  pendingActions: EndpointPendingActions['pending_actions'] = {}
): PendingActions => ({
  pendingIsolate: pendingActions?.isolate ?? 0,
  pendingUnIsolate: pendingActions?.unisolate ?? 0,
  pendingKillProcess: pendingActions?.['kill-process'] ?? 0,
  pendingSuspendProcess: pendingActions?.['suspend-process'] ?? 0,
  pendingRunningProcesses: pendingActions?.['running-processes'] ?? 0,
  pendingGetFile: pendingActions?.['get-file'] ?? 0,
  pendingExecute: pendingActions?.execute ?? 0,
});
