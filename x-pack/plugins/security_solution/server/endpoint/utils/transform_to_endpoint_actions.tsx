/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  LogsOsqueryAction,
  LogsOsqueryResponse,
  OsqueryAction,
  OsqueryResponse,
} from '../../../common/endpoint/types';
import { isLogsOsqueryResponse, isOsqueryAction } from '../services/actions/utils';

export const transformToEndpointActions = (
  actions: Array<SearchHit<OsqueryAction | LogsEndpointAction>>
): Array<SearchHit<LogsOsqueryAction | LogsEndpointAction>> => {
  const result = map(actions, (action) => {
    const source = action._source;

    if (source && isOsqueryAction(source)) {
      console.log('osquerySource', source);
      return {
        ...action,
        _source: {
          EndpointActions: {
            ...source,
            queriesIds: map(source.queries, (query) => query.action_id),
            data: {
              command: 'osquery',
            },
          },
          alert_ids: source.alert_ids,
          agent: { id: source.agents },
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
  return result as Array<SearchHit<LogsOsqueryAction | LogsEndpointAction>>;
};

export const transformToEndpointResponse = (
  responses: Array<SearchHit<EndpointActionResponse | LogsEndpointActionResponse | OsqueryResponse>>
): Array<SearchHit<EndpointActionResponse | LogsEndpointActionResponse | LogsOsqueryResponse>> => {
  const result = map(responses, (response) => {
    const source = response._source;

    if (source && isLogsOsqueryResponse(source)) {
      return {
        ...response,
        _source: {
          '@timestamp': source['@timestamp'],
          agent: { id: source.agent_id },
          EndpointActions: {
            ...source,
            data: {
              command: source.command ?? 'osquery',
            },
          },
        },
      };
    }
    return response;
  });
  return result as Array<
    SearchHit<EndpointActionResponse | LogsEndpointActionResponse | LogsOsqueryResponse>
  >;
};
