/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  LogsEndpointAction,
  LogsOsqueryAction,
  LogsOsqueryActionTransformed,
} from '../../../common/endpoint/types';

// TODO use enum for osquery
const isOsqueryAction = (
  source: LogsEndpointAction | LogsOsqueryAction | undefined
): source is LogsOsqueryAction => {
  return (source && 'input_type' in source && source.input_type === 'osquery') || false;
};

export const transformToEndpointActions = (
  actions: Array<SearchHit<LogsOsqueryAction | LogsEndpointAction>>
): Array<SearchHit<LogsOsqueryActionTransformed | LogsEndpointAction>> => {
  const result = map(actions, (action) => {
    if (isOsqueryAction(action?._source)) {
      const source = action._source;

      return {
        ...action,
        _source: {
          EndpointActions: {
            data: {
              command: 'osquery' as const,
              // queries: source.queries,
            },
            action_id: source.action_id,
            input_type: source.input_type,
            expiration: source.expiration,
            type: source.type,
          },
          // alert: { id: source.alert_ids?.[0] },
          agent: { id: source.agent_ids },
          '@timestamp': source['@timestamp'],
          event: {
            agent_id_status: '',
            ingested: '',
          },
          user: { id: source.user_id },
        },
      };
    }
    return action;
  });
  return result as Array<SearchHit<LogsOsqueryActionTransformed | LogsEndpointAction>>;
};
