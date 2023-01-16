/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';

import { ActionRunner } from './action_runner';
import { createAgentAction } from './actions';
import { BulkActionTaskType } from './bulk_action_types';

export class RequestDiagnosticsActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await requestDiagnosticsBatch(this.esClient, agents, this.actionParams!);
  }

  protected getTaskType() {
    return BulkActionTaskType.REQUEST_DIAGNOSTICS_RETRY;
  }

  protected getActionType() {
    return 'REQUEST_DIAGNOSTICS';
  }
}

export async function requestDiagnosticsBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  options: {
    actionId?: string;
    total?: number;
  }
): Promise<{ actionId: string }> {
  const now = new Date().toISOString();

  const actionId = options.actionId ?? uuid();
  const total = options.total ?? givenAgents.length;

  const agentIds = givenAgents.map((agent) => agent.id);

  await createAgentAction(esClient, {
    id: actionId,
    agents: agentIds,
    created_at: now,
    type: 'REQUEST_DIAGNOSTICS',
    total,
  });

  return {
    actionId,
  };
}
