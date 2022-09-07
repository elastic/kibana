/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, uniq } from 'lodash';
import { convertECSMappingToObject } from '../../../../common/detection_engine/transform_actions';
import type { SetupPlugins } from '../../../plugin_contract';

interface OsqueryQuery {
  id: string;
  query: string;
  ecsMapping?: Record<string, Record<'field', string>>;
}

interface OsqueryResponseAction {
  actionTypeId: string;
  params: {
    id: string;
    queries: OsqueryQuery[];
    savedQueryId: string;
    query: string;
    packId: string;
    ecs_mapping?: Record<string, Record<'field', string>>;
  };
}

export type ResponseAction = OsqueryResponseAction;

interface ScheduleNotificationActions {
  signals: unknown[];
  responseActions: ResponseAction[];
}

interface IAlert {
  agent: {
    id: string;
  };
}

export const scheduleNotificationResponseActions = (
  { signals, responseActions }: ScheduleNotificationActions,
  osqueryCreateAction?: SetupPlugins['osquery']['osqueryCreateAction']
) => {
  const filteredAlerts = (signals as IAlert[]).filter((alert) => alert.agent?.id);
  const agentIds = uniq(filteredAlerts.map((alert: IAlert) => alert.agent?.id));
  const alertIds = map(filteredAlerts, '_id');

  responseActions.forEach((responseActionParam) => {
    if (responseActionParam.actionTypeId === '.osquery' && osqueryCreateAction) {
      const { savedQueryId, packId, queries, ...rest } = responseActionParam.params;
      return osqueryCreateAction({
        agent_all: undefined,
        agent_platforms: undefined,
        agent_policy_ids: undefined,
        case_ids: undefined,
        event_ids: undefined,
        metadata: undefined,
        pack_id: packId,
        queries: map(queries, (query, queryId) => {
          return {
            id: queryId,
            query: query.query,
            ecs_mapping: query.ecs_mapping,
            // ecsMapping: convertECSMappingToObject(query.ecs_mapping), // todo probably not needed
            version: '',
            platform: '',
          };
        }),
        ...rest,
        // TODO WHY do we have to do it here? Find place where ecs_mapping is transformed for API, wrong type, should be Record<field> and is array...
        ecs_mapping: convertECSMappingToObject(responseActionParam.params.ecs_mapping),
        saved_query_id: savedQueryId,
        agent_ids: agentIds,
        alert_ids: alertIds,
      });
    }
  });
};
