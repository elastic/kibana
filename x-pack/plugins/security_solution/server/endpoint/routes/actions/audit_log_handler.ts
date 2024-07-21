/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type {
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
} from '../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { getAuditLogResponse } from '../../services/actions/actions_audit_log';
import type { EndpointAppContext } from '../../types';

export const auditLogRequestHandler = (
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
      query: { page, page_size: pageSize, start_date: startDate, end_date: endDate },
    } = req;

    const body = await getAuditLogResponse({
      elasticAgentId,
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
