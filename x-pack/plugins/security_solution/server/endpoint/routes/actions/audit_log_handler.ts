/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from 'kibana/server';
import {
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
} from '../../../../common/endpoint/schema/actions';
import { getAuditLogResponse } from './service';
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
      query: { page, page_size: pageSize },
    } = req;

    const body = await getAuditLogResponse({ elasticAgentId, page, pageSize, context, logger });
    return res.ok({
      body,
    });
  };
};
