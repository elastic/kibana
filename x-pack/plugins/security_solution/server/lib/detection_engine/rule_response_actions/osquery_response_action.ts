/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, some, uniq } from 'lodash';
import type { SetupPlugins } from '../../../plugin_contract';
import type { RuleResponseOsqueryAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { AlertsWithAgentType } from './types';

const CONTAINS_DYNAMIC_PARAMETER_REGEX = /\{{([^}]+)\}}/g; // when there are 2 opening and 2 closing curly brackets (including brackets)

export const osqueryResponseAction = (
  responseAction: RuleResponseOsqueryAction,
  osqueryCreateAction: SetupPlugins['osquery']['osqueryCreateAction'],
  { alerts, alertIds, agents }: AlertsWithAgentType
) => {
  const agentIds = uniq(agents);

  const temporaryQueries = responseAction.params.queries?.length
    ? responseAction.params.queries
    : [{ query: responseAction.params.query }];
  const containsDynamicQueries = some(temporaryQueries, (query) => {
    return query.query ? CONTAINS_DYNAMIC_PARAMETER_REGEX.test(query.query) : false;
  });
  const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;

  if (!containsDynamicQueries) {
    return osqueryCreateAction({
      ...rest,
      queries,
      ecs_mapping: ecsMapping,
      saved_query_id: savedQueryId,
      agent_ids: agentIds,
      alert_ids: alertIds,
    });
  }
  each(alerts, (alert) => {
    return osqueryCreateAction(
      {
        ...rest,
        queries,
        ecs_mapping: ecsMapping,
        saved_query_id: savedQueryId,
        agent_ids: alert.agent?.id ? [alert.agent.id] : [],
        alert_ids: [(alert as unknown as { _id: string })._id],
      },
      alert
    );
  });
};
