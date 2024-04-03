/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, map, some, uniq } from 'lodash';
import { containsDynamicQuery } from '@kbn/osquery-plugin/common/utils/replace_params_query';
import { requiredOptional } from '@kbn/zod-helpers';
import type { ResponseActionAlerts } from './types';
import type { SetupPlugins } from '../../../plugin_contract';
import type { RuleResponseOsqueryAction } from '../../../../common/api/detection_engine/model/rule_response_actions';

export const osqueryResponseAction = (
  responseAction: RuleResponseOsqueryAction,
  osqueryCreateActionService: SetupPlugins['osquery']['createActionService'],
  { alerts }: ResponseActionAlerts
) => {
  const temporaryQueries = responseAction.params.queries?.length
    ? responseAction.params.queries
    : [{ query: responseAction.params.query }];
  const containsDynamicQueries = some(
    temporaryQueries,
    (query) => query.query && containsDynamicQuery(query.query)
  );

  const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;

  if (!containsDynamicQueries) {
    const agentIds = uniq(map(alerts, 'agent.id'));
    const alertIds = map(alerts, '_id');

    return osqueryCreateActionService.create({
      ...rest,
      queries: requiredOptional(queries),
      ecs_mapping: ecsMapping,
      saved_query_id: savedQueryId,
      agent_ids: agentIds,
      alert_ids: alertIds,
    });
  }
  each(alerts, (alert) => {
    return osqueryCreateActionService.create(
      {
        ...rest,
        queries: requiredOptional(queries),
        ecs_mapping: ecsMapping,
        saved_query_id: savedQueryId,
        agent_ids: alert.agent?.id ? [alert.agent.id] : [],
        alert_ids: [(alert as unknown as { _id: string })._id],
      },
      alert
    );
  });
};
