/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import type { estypes } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../../fleet/common';
import { SecuritySolutionRequestHandlerContext } from '../../../types';

const getShouldClauses = ({
  indices,
  elasticAgentId,
}: {
  indices: string[];
  elasticAgentId: string;
}) => {
  return indices.map((_index) => {
    const clause = {
      bool: {
        must: [
          {
            match: {
              _index,
            },
          },
          {
            match: {
              [_index === AGENT_ACTIONS_INDEX ? 'agents' : 'agent_id']: elasticAgentId,
            },
          },
        ],
      },
    };
    // only `endpoint` actions in the result
    if (_index === AGENT_ACTIONS_INDEX) {
      clause.bool.must.push({
        match: {
          input_type: 'endpoint',
        },
      });
    }
    return clause;
  });
};

export const getAuditLogESQuery = ({
  elasticAgentId,
  from,
  size,
}: {
  elasticAgentId: string;
  from: number;
  size: number;
}): estypes.SearchRequest => {
  const indices = [AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX];

  return {
    index: indices,
    size,
    from,
    body: {
      query: {
        bool: {
          should: getShouldClauses({
            indices,
            elasticAgentId,
          }),
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
};

export const getAuditLogResponse = async ({
  elasticAgentId,
  page,
  pageSize,
  context,
  logger,
}: {
  elasticAgentId: string;
  page: number;
  pageSize: number;
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
}): Promise<{
  page: number;
  pageSize: number;
  data: Array<{
    type: 'action' | 'response';
    item: {
      id: string;
      data: unknown;
    };
  }>;
}> => {
  const size = pageSize;
  const from = page <= 1 ? 0 : page * pageSize - pageSize + 1;

  const options = {
    headers: {
      'X-elastic-product-origin': 'fleet',
    },
    ignore: [404],
  };
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  let result;
  const params = getAuditLogESQuery({
    elasticAgentId,
    from,
    size,
  });

  try {
    result = await esClient.search(params, options);
  } catch (error) {
    logger.error(error);
    throw error;
  }
  if (result?.statusCode !== 200) {
    logger.error(`Error fetching actions log for agent_id ${elasticAgentId}`);
    throw new Error(`Error fetching actions log for agent_id ${elasticAgentId}`);
  }

  return {
    page,
    pageSize,
    data: result.body.hits.hits.map((e) => ({
      type: e._index.startsWith('.fleet-actions') ? 'action' : 'response',
      item: { id: e._id, data: e._source },
    })),
  };
};
