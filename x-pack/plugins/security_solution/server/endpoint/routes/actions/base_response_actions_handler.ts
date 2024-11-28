/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { ResponseActionsClient } from '../../services';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
} from '../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { ResponseActionsRequestBody } from '../../../../common/api/endpoint';
import { getResponseActionsClient, NormalizedExternalConnectorClient } from '../../services';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { stringify } from '../../utils/stringify';
import { errorHandler } from '../error_handler';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { responseActionsWithLegacyActionProperty } from '../../services/actions/constants';

export function createBaseActionRequestHandler<T extends EndpointActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: ResponseActionsApiCommandNames,
  featureValidationFn: (
    agentType: ResponseActionAgentType | undefined,
    experimentalFeatures: EndpointAppContext['experimentalFeatures']
  ) => boolean,
  actionCreationFn: (
    command: ResponseActionsApiCommandNames,
    body: ResponseActionsRequestBody,
    responseActionsClient: ResponseActionsClient
  ) => Promise<ActionDetails>
): RequestHandler<
  unknown,
  unknown,
  ResponseActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> {
  const logger = endpointContext.logFactory.get('responseActionsHandler');

  return async (context, req, res) => {
    logger.debug(() => `response action [${command}]:\n${stringify(req.body)}`);

    const experimentalFeatures = endpointContext.experimentalFeatures;

    // Validate feature availability
    if (!featureValidationFn(req.body.agent_type, experimentalFeatures)) {
      return errorHandler(
        logger,
        res,
        new CustomHttpRequestError(`[request body.agent_type]: feature is disabled`, 400)
      );
    }

    const coreContext = await context.core;
    const user = coreContext.security.authc.getCurrentUser();
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const casesClient = await endpointContext.service.getCasesClient(req);
    const connectorActions = (await context.actions).getActionsClient();
    const responseActionsClient: ResponseActionsClient = getResponseActionsClient(
      req.body.agent_type || 'endpoint',
      {
        esClient,
        casesClient,
        endpointService: endpointContext.service,
        username: user?.username || 'unknown',
        connectorActions: new NormalizedExternalConnectorClient(connectorActions, logger),
      }
    );

    try {
      const action: ActionDetails = await actionCreationFn(
        command,
        req.body,
        responseActionsClient
      );
      const { action: actionId, ...data } = action;
      const legacyResponseData = responseActionsWithLegacyActionProperty.includes(command)
        ? { action: actionId ?? data.id ?? '' }
        : {};

      return res.ok({
        body: {
          ...legacyResponseData,
          data,
        },
      });
    } catch (err) {
      return errorHandler(logger, res, err);
    }
  };
}
