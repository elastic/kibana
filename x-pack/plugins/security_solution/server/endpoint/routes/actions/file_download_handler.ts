/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { validateActionId } from '../../services/actions/validate_action_id';
import { errorHandler } from '../error_handler';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointActionFileDownloadParams } from '../../../../common/endpoint/schema/actions';
import { EndpointActionFileDownloadSchema } from '../../../../common/endpoint/schema/actions';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContext } from '../../types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { getFileDownloadStream, validateActionFileId } from '../../services/actions/action_files';

export const registerActionFileDownloadRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('actionFileDownload');

  router.get(
    {
      path: ACTION_AGENT_FILE_DOWNLOAD_ROUTE,
      validate: EndpointActionFileDownloadSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
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
    const { action_id: actionId, file_id: fileId } = req.params;
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    try {
      await validateActionId(esClient, actionId);
      await validateActionFileId(esClient, logger, fileId, actionId);

      const { stream, fileName } = await getFileDownloadStream(esClient, logger, fileId);

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
