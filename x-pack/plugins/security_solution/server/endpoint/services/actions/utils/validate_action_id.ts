/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { NotFoundError } from '../../../errors';
import { catchAndWrapError } from '../../../utils';
import type { LogsEndpointAction } from '../../../../../common/endpoint/types';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';

/**
 * Validates that a given action ID is a valid Endpoint action
 *
 * @throws
 */
export const validateActionId = async (
  esClient: ElasticsearchClient,
  actionId: string,
  agentType?: ResponseActionAgentType
): Promise<void> => {
  const response = await esClient
    .search<LogsEndpointAction>({
      index: ENDPOINT_ACTIONS_INDEX,
      body: {
        query: {
          bool: {
            filter: [
              { term: { action_id: actionId } },
              { term: { type: 'INPUT_ACTION' } },
              ...(agentType ? [{ term: { 'EndpointActions.input_type': agentType } }] : []),
            ],
          },
        },
      },
      _source: false,
      size: 1,
    })
    .catch(catchAndWrapError);

  if (!(response.hits?.total as SearchTotalHits)?.value) {
    throw new NotFoundError(
      `Action id [${actionId}] not found${
        agentType ? ` with an agent type of [${agentType}]` : ''
      }`,
      response
    );
  }
};
