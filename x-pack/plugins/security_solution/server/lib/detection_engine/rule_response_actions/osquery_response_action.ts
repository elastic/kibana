/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, reduce, some, uniq } from 'lodash';
import { containsDynamicQuery } from '@kbn/osquery-plugin/common/utils/replace_params_query';
import type { SetupPlugins } from '../../../plugin_contract';
import type { RuleResponseOsqueryAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { OsqueryResponseActionAlert, ResponseActionAlerts } from './types';

export const osqueryResponseAction = (
  responseAction: RuleResponseOsqueryAction,
  osqueryCreateActionService: SetupPlugins['osquery']['createActionService'],
  { alerts: filteredAlerts }: ResponseActionAlerts
) => {
  const temporaryQueries = responseAction.params.queries?.length
    ? responseAction.params.queries
    : [{ query: responseAction.params.query }];
  const containsDynamicQueries = some(
    temporaryQueries,
    (query) => query.query && containsDynamicQuery(query.query)
  );

  // Todo: add support for dynamic values so we can limit number of unnecessary alerts === action calls
  const { alerts, agentIds, alertIds }: OsqueryResponseActionAlert = reduce(
    filteredAlerts,
    (acc, alert) => {
      const agentId = alert.agent?.id;
      if (agentId !== undefined) {
        return {
          alerts: [...acc.alerts, alert],
          agentIds: uniq([...acc.agentIds, agentId]),
          alertIds: [...acc.alertIds, (alert as unknown as { _id: string })._id],
        };
      }
      return acc;
    },
    { alerts: [], agentIds: [], alertIds: [] } as OsqueryResponseActionAlert
  );

  const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;

  if (!containsDynamicQueries) {
    return osqueryCreateActionService.create({
      ...rest,
      queries,
      ecs_mapping: ecsMapping,
      saved_query_id: savedQueryId,
      agent_ids: agentIds,
      alert_ids: alertIds,
    });
  }
  // Todo: flatten for uniquer dynamic values when we add support to this, as with Endpoint Actions
  each(alerts, (alert) => {
    return osqueryCreateActionService.create(
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
