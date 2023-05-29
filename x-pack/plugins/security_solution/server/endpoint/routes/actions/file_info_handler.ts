/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { validateActionId } from '../../services';
import { ACTION_AGENT_FILE_INFO_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';
import type { EndpointActionFileInfoParams } from '../../../../common/endpoint/schema/actions';
import type {
  SecuritySolutionRequestHandlerContext,
  SecuritySolutionPluginRouter,
} from '../../../types';
import { EndpointActionFileInfoSchema } from '../../../../common/endpoint/schema/actions';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { errorHandler } from '../error_handler';
import type { ActionFileInfoApiResponse } from '../../../../common/endpoint/types';

export const getActionFileInfoRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  EndpointActionFileInfoParams,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('actionFileInfo');

  return async (context, req, res) => {
    const fleetFiles = await endpointContext.service.getFleetFilesClient('from-host');
    const { action_id: requestActionId, file_id: fileId } = req.params;
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    try {
      await validateActionId(esClient, requestActionId);
      const { actionId, mimeType, status, size, name, id, agents, created } = await fleetFiles.get(
        fileId
      );

      if (id !== fileId) {
        throw new CustomHttpRequestError(
          `Invalid file id [${fileId}] for action [${requestActionId}]`,
          400
        );
      }

      const response: ActionFileInfoApiResponse = {
        data: {
          name,
          id,
          mimeType,
          size,
          status,
          created,
          actionId,
          agentId: agents.at(0) ?? '',
        },
      };

      return res.ok({ body: response });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};

export const registerActionFileInfoRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.get(
    {
      path: ACTION_AGENT_FILE_INFO_ROUTE,
      validate: EndpointActionFileInfoSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canWriteFileOperations'] },
      endpointContext.logFactory.get('actionFileInfo'),
      getActionFileInfoRouteHandler(endpointContext)
    )
  );
};
