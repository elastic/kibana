/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from 'kibana/server';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../../fleet/common';
import {
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
} from '../../../../common/endpoint/schema/actions';

import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { EndpointAppContext } from '../../types';

export const actionsLogRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('audit_log');

  return async (context, req, res) => {
    const {
      params: { agent_id: elasticAgentId },
      query: { page = 1, page_size: pageSize = 50 },
    } = req;

    const size = pageSize;
    const from = page <= 1 ? 0 : page * pageSize - pageSize + 1;

    const options = {
      headers: {
        'X-elastic-product-origin': 'fleet',
      },
    };
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    let result;

    try {
      result = await esClient.search(
        {
          index: [AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX],
          size,
          from,
          body: {
            query: {
              bool: {
                should: [
                  { terms: { agents: [elasticAgentId] } },
                  { terms: { agent_id: [elasticAgentId] } },
                ],
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
        },
        options
      );
    } catch (error) {
      logger.error(error);
      throw error;
    }
    if (result?.statusCode !== 200) {
      logger.error(`Error fetching actions log for agent_id ${req.params.agent_id}`);
      throw new Error(`Error fetching actions log for agent_id ${req.params.agent_id}`);
    }

    return res.ok({
      body: {
        total:
          typeof result.body.hits.total === 'number'
            ? result.body.hits.total
            : result.body.hits.total.value,
        items: result.body.hits.hits.map((e) => ({
          type: e._index.startsWith('.fleet-actions') ? 'action' : 'response',
          item: { id: e._id, data: e._source },
        })),
      },
    });
  };
};
