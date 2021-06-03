/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { AGENT_ACTIONS_INDEX } from '../../../../../fleet/common';
import { EndpointActionLogRequestSchema } from '../../../../common/endpoint/schema/actions';

import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { EndpointAppContext } from '../../types';

export const actionsLogRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof EndpointActionLogRequestSchema.params>,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('audit_log');
  return async (context, req, res) => {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    let result;
    try {
      result = await esClient.search({
        index: AGENT_ACTIONS_INDEX,
        body: {
          query: {
            match: {
              agents: req.params.agent_id,
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
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
    if (result?.statusCode !== 200) {
      logger.error(`Error fetching actions log for agent_id ${req.params.agent_id}`);
      throw new Error(`Error fetching actions log for agent_id ${req.params.agent_id}`);
    }

    return res.ok({
      body: result.body.hits.hits.map((e) => e._source),
    });
  };
};
