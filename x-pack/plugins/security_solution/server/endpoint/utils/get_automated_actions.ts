/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SearchRequest } from '@kbn/data-plugin/common';
import { map, reduce } from 'lodash';
import type { LogsEndpointAction } from '../../../common/endpoint/types';
import type { GetActionDetailsListParam } from '../services/actions/action_list';
import { ENDPOINT_ACTIONS_INDEX, OSQUERY_ACTIONS_INDEX } from '../../../common/endpoint/constants';
import { catchAndWrapError } from './wrap_errors';

const queryOptions = Object.freeze({
  ignore: [404],
});

export interface ActionIdWithExpirationTime {
  actionId: string;
  expiration: string;
}

export const getAutomatedActions = async ({
  esClient,
  from,
  size,
  userIds,
  alertIds,
  agentIds = [],
}: Omit<GetActionDetailsListParam, 'logger'>): Promise<{
  actionIdsWithExpiration: ActionIdWithExpirationTime[];
  actionRequests: TransportResult<estypes.SearchResponse<LogsEndpointAction>, unknown>;
}> => {
  const additionalFilters = [];

  additionalFilters.push({ terms: { 'EndpointActions.data.alert_ids': alertIds } });
  additionalFilters.push({ terms: { alert_ids: alertIds } });

  const should: SearchRequest = [
    { terms: { 'EndpointActions.data.alert_ids': alertIds } },
    { terms: { alert_ids: alertIds } },
    { term: { type: 'INPUT_ACTION' } },
  ];

  const actionsSearchQuery: SearchRequest = {
    index: [ENDPOINT_ACTIONS_INDEX, OSQUERY_ACTIONS_INDEX],
    size,
    from,
    body: {
      query: {
        bool: {
          should,
          minimum_should_match: 2,
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
  };

  const actionRequests: TransportResult<
    estypes.SearchResponse<LogsEndpointAction>,
    unknown
  > = await esClient
    .search<LogsEndpointAction>(actionsSearchQuery, {
      ...queryOptions,
      meta: true,
    })
    .catch(catchAndWrapError);

  const actionsHits = actionRequests?.body?.hits?.hits;

  const actionIds: Array<{
    actionId: string;
    rootActionId?: string;
    expiration: string;
  }> = reduce(
    actionsHits,
    (acc, action) => {
      const source = action._source;
      if (source.input_type === 'osquery') {
        const queriesIds = map(source.queries, (query) => {
          return {
            actionId: query.action_id,
            rootActionId: source.action_id,
            expiration: source.expiration,
          };
        });
        return [...acc, ...queriesIds];
      }
      if (source.EndpointActions?.input_type === 'endpoint') {
        return [
          ...acc,
          {
            actionId: source.EndpointActions.action_id,
            expiration: source.EndpointActions.expiration,
          },
        ];
      }
      return acc;
    },
    []
  );

  // console.log({ '22222': actionIds });
  return { actionIds, actionsHits };

  //
  // const actionIdsWithExpirationMap: ActionIdWithExpirationTime[] = reduce(
  //   actionsHits,
  //   (acc, action) => {
  //     const source = action._source;
  //     if (source.input_type === 'osquery') {
  //       const queriesIds = map(source.queries, (query) => {
  //         return {
  //           [query.action_id]: {
  //             actionId: query.action_id,
  //             expiration: source.expiration,
  //           },
  //         };
  //       });
  //       return [...acc, ...queriesIds];
  //     }
  //     if (source.EndpointActions?.input_type === 'endpoint') {
  //       return [
  //         ...acc,
  //         {
  //           [source.EndpointActions.action_id]: {
  //             actionId: source.EndpointActions.action_id,
  //             expiration: source.EndpointActions.expiration,
  //           },
  //         },
  //       ];
  //     }
  //     return acc;
  //   },
  //   []
  // );
  //
  // const hitsWithExpiration = map(actionsHits, (action) => {
  //   const source = action._source;
  //
  //   console.log({ source });
  //   if (source.input_type === 'osquery') {
  //     console.log({ actionIdsWithExpirationMap });
  //     console.log({ 'source.action_id': source.action_id });
  //     return {
  //       ...action,
  //       _source: {
  //         ...source,
  //         expiration: actionIdsWithExpirationMap[source.action_id],
  //       },
  //     };
  //   }
  //   if (source.EndpointActions?.input_type === 'endpoint') {
  //     return {
  //       ...action,
  //       _source: {
  //         ...source,
  //         expiration: actionIdsWithExpirationMap[source.EndpointActions.data.expiration],
  //       },
  //     };
  //   }
  //   return action;
  // });
};
