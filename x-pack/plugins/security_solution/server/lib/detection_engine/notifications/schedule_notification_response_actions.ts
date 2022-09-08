/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, uniq } from 'lodash';
import type { EcsMappingFormValueArray } from '@kbn/osquery-plugin/common/schemas/common/utils';
import { convertECSMappingToObject } from '../../../../common/detection_engine/transform_actions';
import type { SetupPlugins } from '../../../plugin_contract';

interface OsqueryQuery {
  id: string;
  query: string;
  ecs_mapping?: Record<string, Record<'field', string>>;
}

interface OsqueryResponseAction {
  actionTypeId: string;
  params: {
    id: string;
    queries: OsqueryQuery[];
    savedQueryId: string;
    query: string;
    packId: string;
    ecs_mapping?: EcsMappingFormValueArray;
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
      const {
        savedQueryId,
        packId,
        queries,
        ecs_mapping: ecsMapping,
        ...rest
      } = responseActionParam.params;
      return osqueryCreateAction({
        pack_id: packId,
        queries: map(queries, (query, queryId: string) => {
          return {
            ...query,
            id: queryId,
            query: query.query,
            ecs_mapping: query.ecs_mapping,
            version: '',
            platform: '',
          };
        }),
        ...rest,
        ecs_mapping: convertECSMappingToObject(ecsMapping),
        saved_query_id: savedQueryId,
        agent_ids: agentIds,
        alert_ids: alertIds,
      });
    }
  });
};
