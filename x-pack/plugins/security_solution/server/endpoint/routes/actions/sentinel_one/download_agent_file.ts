/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { Readable } from 'stream';
import { NormalizedExternalConnectorClient } from '../../../services';
import type { EndpointAppContext } from '../../../types';
import type { ResponseActionsRequestBody } from '../../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';

export const getSentinelOneDownloadAgentFileHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  { agentUUID: string; activityId: string },
  unknown,
  ResponseActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('sentineloneDownloadAgentFile');

  return async (context, request, response) => {
    const { agentUUID, activityId } = request.params;

    logger.debug(
      `Getting file for SentinelOne Agent UUID [${agentUUID}] and Activity ID [${activityId}]`
    );

    const actionsPluginClient = (await context.actions).getActionsClient();
    const connectorClient = new NormalizedExternalConnectorClient(actionsPluginClient, logger);
    connectorClient.setup(SENTINELONE_CONNECTOR_ID);

    const fileRequest = await connectorClient.execute({
      params: {
        subAction: SUB_ACTION.DOWNLOAD_AGENT_FILE,
        subActionParams: {
          agentUUID,
          activityId,
        },
      },
    });

    return response.ok({
      body: fileRequest.data as Readable,
      headers: {
        'content-type': 'application/octet-stream',
        'cache-control': 'max-age=31536000, immutable',
        // Note, this name can be overridden by the client if set via a "download" attribute on the HTML tag.
        // FIXME:PT POC code below. we should get file name from the activity entry and use that instead
        'content-disposition': `attachment; filename="download.zip"`,
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
        'x-content-type-options': 'nosniff',
      },
    });
  };
};
