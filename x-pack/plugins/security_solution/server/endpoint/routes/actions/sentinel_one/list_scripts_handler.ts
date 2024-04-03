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
import { NormalizedExternalConnectorClient } from '../../../services/actions/clients/lib/normalized_external_connector_client';
import type { EndpointAppContext } from '../../../types';
import type { ResponseActionsRequestBody } from '../../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';

export const getSentinelOneListScriptsHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  unknown,
  ResponseActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('sentineloneListScripts');

  return async (context, request, response) => {
    const actionsPluginClient = (await context.actions).getActionsClient();
    const connectorClient = new NormalizedExternalConnectorClient(
      SENTINELONE_CONNECTOR_ID,
      actionsPluginClient,
      logger
    );

    const scriptListApiResponse = await connectorClient.execute({
      params: {
        subAction: SUB_ACTION.GET_REMOTE_SCRIPTS,
        subActionParams: {},
      },
    });

    return response.ok({
      body: {
        data: scriptListApiResponse.data.data,
      },
    });
  };
};
