/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionRefIdsAgg,
  InMemoryAggRes,
  ConnectorAggRes,
  ByActionTypeIdAgg,
} from '../actions_telemetry';

export function getInMemoryActions(aggregation: ActionRefIdsAgg[] = []) {
  const preconfiguredActionsAggs: InMemoryAggRes = { total: 0, actionRefs: {} };
  const systemActionsAggs: InMemoryAggRes = { total: 0, actionRefs: {} };
  for (const a of aggregation) {
    const actionRef = a.key[0];
    const actionTypeId = a.key[1];
    if (actionRef.startsWith('preconfigured:')) {
      preconfiguredActionsAggs.actionRefs[actionRef] = { actionRef, actionTypeId };
      preconfiguredActionsAggs.total++;
    }
    if (actionRef.startsWith('system_action:')) {
      systemActionsAggs.actionRefs[actionRef] = { actionRef, actionTypeId };
      systemActionsAggs.total++;
    }
  }

  return { preconfiguredActionsAggs, systemActionsAggs };
}

export function getActions(aggregation: ActionRefIdsAgg[] = []) {
  const actions: { total: number; connectorIds: Record<string, string> } = {
    total: 0,
    connectorIds: {},
  };
  for (const a of aggregation) {
    const connectorId = a.key[0];
    const actionRef = a.key[1];
    actions.connectorIds[connectorId] = actionRef;
    actions.total++;
  }

  return actions;
}

export function getActionExecutions(aggregation: ByActionTypeIdAgg[] = []) {
  const executions: ConnectorAggRes = { total: 0, connectorTypes: {} };
  for (const a of aggregation) {
    executions.connectorTypes[a.key] = a.doc_count;
    executions.total += a.doc_count;
  }

  return executions;
}

export function getActionsCount(aggregation: ByActionTypeIdAgg[] = []) {
  const actions: Record<string, number> = {};
  for (const a of aggregation) {
    actions[a.key] = a.doc_count;
  }

  return actions;
}
