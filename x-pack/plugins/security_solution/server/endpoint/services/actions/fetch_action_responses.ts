/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  EndpointActionResponse,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { ACTIONS_SEARCH_PAGE_SIZE } from './constants';
import { catchAndWrapError } from '../../utils';
import { ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN } from '../../../../common/endpoint/constants';

interface FetchActionResponsesOptions {
  esClient: ElasticsearchClient;
  /** List of specific action ids to filter for */
  actionIds?: string[];
  /** List of specific agent ids to filter for */
  agentIds?: string[];
}

interface FetchActionResponsesResult {
  data: Array<estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>>;
}

/**
 * Fetch Response Action responses
 */
export const fetchActionResponses = async ({
  esClient,
  actionIds = [],
  agentIds = [],
}: FetchActionResponsesOptions): Promise<FetchActionResponsesResult> => {
  const filter = [];

  if (agentIds?.length) {
    filter.push({ terms: { agent_id: agentIds } });
  }
  if (actionIds.length) {
    filter.push({ terms: { action_id: actionIds } });
  }

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter,
    },
  };

  // Get the Action Response(s) from both the Fleet action response index and the Endpoint
  // action response index.
  // We query both indexes separately in order to ensure they are both queried - example if the
  // Fleet actions responses index does not exist yet, ES would generate a `404` and would
  // never actually query the Endpoint Actions index. With support for 3rd party response
  // actions, we need to ensure that both indexes are queried.
  const [fleetResponses, endpointResponses] = await Promise.all([
    // Responses in Fleet index
    esClient
      .search<EndpointActionResponse>(
        {
          index: AGENT_ACTIONS_RESULTS_INDEX,
          size: ACTIONS_SEARCH_PAGE_SIZE,
          body: { query },
        },
        { ignore: [404] }
      )
      .catch(catchAndWrapError),

    // Responses in Endpoint index
    esClient
      .search<LogsEndpointActionResponse>(
        {
          index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
          size: ACTIONS_SEARCH_PAGE_SIZE,
          body: { query },
        },
        { ignore: [404] }
      )
      .catch(catchAndWrapError),
  ]);

  return {
    data: [...(fleetResponses?.hits?.hits ?? []), ...(endpointResponses?.hits?.hits ?? [])],
  };
};
