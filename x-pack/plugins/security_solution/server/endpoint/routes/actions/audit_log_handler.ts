/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { EndpointActionLogRequestBody } from '../../../../common/endpoint/schema/actions';
import { getAuditLogResponse } from '../../services';
import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { EndpointAppContext } from '../../types';

export const actionsLogRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  unknown,
  EndpointActionLogRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('audit_log');

  return async (context, req, res) => {
    const {
      agent_ids: elasticAgentIds,
      page,
      page_size: pageSize,
      start_date: startDate,
      end_date: endDate,
    } = req.body;

    const body = await getAuditLogResponse({
      elasticAgentIds,
      page,
      pageSize,
      startDate,
      endDate,
      context,
      logger,
    });
    return res.ok({
      body,
    });
  };
};
