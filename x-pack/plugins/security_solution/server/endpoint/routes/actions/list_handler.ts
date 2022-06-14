/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { getActionList } from '../../services';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';

export const actionListHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  EndpointActionListRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('endpoint_action_list');

  return async (context, req, res) => {
    const {
      query: { agentIds: elasticAgentIds, page, pageSize, startDate, endDate, userIds, commands },
    } = req;
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    try {
      const body = await getActionList({
        commands,
        esClient,
        elasticAgentIds,
        page,
        pageSize,
        startDate,
        endDate,
        userIds,
        logger,
      });
      return res.ok({
        body,
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};
