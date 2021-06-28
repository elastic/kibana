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
import { ActivityLog, EndpointAction } from '../../../../common/endpoint/types';

const getFilterClause = ({
  index,
  elasticAgentId,
  actionIds,
}: {
  index: typeof AGENT_ACTIONS_INDEX | typeof AGENT_ACTIONS_RESULTS_INDEX;
  elasticAgentId: string;
  actionIds?: string[];
}) => {
  const clause: Array<{ term: { [x: string]: string } } | { terms: { [x: string]: string[] } }> = [
    { term: { [index === AGENT_ACTIONS_INDEX ? 'agents' : 'agent_id']: elasticAgentId } },
  ];

  if (index === AGENT_ACTIONS_INDEX) {
    clause.push(
      { term: { input_type: 'endpoint' } },
      { term: { type: 'INPUT_ACTION' } },
      { term: { agents: elasticAgentId } }
    );
  } else if (actionIds) {
    clause.push({
      terms: {
        action_id: actionIds,
      },
    });
  }

  return clause;
};

export const getAuditLogESQuery = ({
  index,
  elasticAgentId,
  actionIds,
  from,
  size,
}: {
  index: typeof AGENT_ACTIONS_INDEX | typeof AGENT_ACTIONS_RESULTS_INDEX;
  elasticAgentId: string;
  actionIds?: string[];
  from: number;
  size: number;
}): estypes.SearchRequest => {
  return {
    index,
    size,
    from,
    body: {
      query: {
        bool: {
          filter: getFilterClause({ index, elasticAgentId, actionIds }),
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
  let actionsResult;
  let responsesResult;

  try {
    actionsResult = await esClient.search(
      getAuditLogESQuery({
        index: AGENT_ACTIONS_INDEX,
        elasticAgentId,
        from,
        size,
      }),
      options
    );
    const actionIds = actionsResult.body.hits.hits.map(
      (e) => (e._source as EndpointAction).action_id
    );

    responsesResult = await esClient.search(
      getAuditLogESQuery({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        elasticAgentId,
        actionIds,
        from,
        size,
      }),
      options
    );
  } catch (error) {
    logger.error(error);
    throw error;
  }
  if (actionsResult?.statusCode !== 200 || responsesResult?.statusCode !== 200) {
    logger.error(`Error fetching actions log for agent_id ${elasticAgentId}`);
    throw new Error(`Error fetching actions log for agent_id ${elasticAgentId}`);
  }

  const sortedData = ([
    ...actionsResult.body.hits.hits.map((e) => ({
      type: 'action',
      item: { id: e._id, data: e._source },
    })),
    ...responsesResult.body.hits.hits.map((e) => ({
      type: 'response',
      item: { id: e._id, data: e._source },
    })),
  ] as ActivityLog['data']).sort((a, b) =>
    new Date(b.item.data['@timestamp']) > new Date(a.item.data['@timestamp']) ? 1 : -1
  );

  return {
    page,
    pageSize,
    data: sortedData,
  };
};
