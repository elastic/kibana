/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { EndpointActionFileDownloadParams } from '../../../../common/api/endpoint';
import { EndpointActionFileDownloadSchema } from '../../../../common/api/endpoint';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { validateActionId } from '../../services';
import { errorHandler } from '../error_handler';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContext } from '../../types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';

export const registerActionFileDownloadRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('actionFileDownload');

  router.versioned
    .get({
      access: 'public',
      // NOTE:
      // Because this API is used in the browser via `href` (ex. on link to download a file),
      // we need to enable setting the version number via query params
      enableQueryVersion: true,
      path: ACTION_AGENT_FILE_DOWNLOAD_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: EndpointActionFileDownloadSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        getActionFileDownloadRouteHandler(endpointContext)
      )
    );
};

export const getActionFileDownloadRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  EndpointActionFileDownloadParams,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('actionFileDownload');

  return async (context, req, res) => {
    const fleetFiles = await endpointContext.service.getFleetFromHostFilesClient();
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const { action_id: actionId, file_id: fileId } = req.params;

    try {
      await validateActionId(esClient, actionId);
      const file = await fleetFiles.get(fileId);

      if (file.id !== fileId) {
        throw new CustomHttpRequestError(
          `Invalid file id [${fileId}] for action [${actionId}]`,
          400
        );
      }

      const { stream, fileName } = await fleetFiles.download(fileId);

      return res.ok({
        body: stream,
        headers: {
          'content-type': 'application/octet-stream',
          'cache-control': 'max-age=31536000, immutable',
          // Note, this name can be overridden by the client if set via a "download" attribute on the HTML tag.
          'content-disposition': `attachment; filename="${fileName ?? 'download.zip'}"`,
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
          'x-content-type-options': 'nosniff',
        },
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};
