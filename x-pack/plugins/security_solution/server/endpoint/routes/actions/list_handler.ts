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
import type {
  AgentsActionsLogRequestParams,
  AgentsActionsLogRequestQuery,
} from '../../../../common/endpoint/schema/actions';
import { getActionList } from '../../services';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';

export const actionListHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  AgentsActionsLogRequestParams,
  AgentsActionsLogRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('actions_log');

  return async (context, req, res) => {
    const {
      params: { agent_ids: elasticAgentIds },
      query: {
        page,
        page_size: pageSize,
        start_date: startDate,
        end_date: endDate,
        user_ids: userIds,
        action_types: actionTypes,
      },
    } = req;

    const body = await getActionList({
      actionTypes,
      elasticAgentIds,
      page,
      pageSize,
      startDate,
      endDate,
      userIds,
      context,
      logger,
    });
    return res.ok({
      body,
    });
  };
};
