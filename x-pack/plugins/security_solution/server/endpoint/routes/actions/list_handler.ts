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

export const actionListHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  EndpointActionListRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('action_list');

  return async (context, req, res) => {
    const {
      query: {
        agentIds: elasticAgentIds,
        page,
        pageSize,
        startDate,
        endDate,
        userIds,
        actionTypes,
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
