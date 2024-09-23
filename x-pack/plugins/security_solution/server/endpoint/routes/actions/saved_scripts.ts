/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { CROWDSTRIKE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type {
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
} from '../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import type { NormalizedExternalConnectorClientExecuteOptions } from '../../services';
import { NormalizedExternalConnectorClient } from '../../services';

import { SAVED_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';

import type { SecuritySolutionPluginRouter } from '../../../types';

export function registerSavedScriptsRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: any
) {
  router.versioned
    .get({
      access: 'public',
      path: SAVED_SCRIPTS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {},
      },
      SavedScriptsRequestHandler(endpointContext)
    );
}

export const SavedScriptsRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('audit_log');

  return async (context, req, res) => {
    console.log({ reqBody: JSON.stringify(req, null, 2) });
    const connectorActions = (await context.actions).getActionsClient();

    console.log({ connectorActions });
    const executeOptions: NormalizedExternalConnectorClientExecuteOptions = {
      params: {
        subAction: 'getScripts',
        subActionParams: {
          endpoint_ids: ['test'],
        },
      },
    };
    const connectorActionsClient = new NormalizedExternalConnectorClient(connectorActions, logger);
    connectorActionsClient.setup(CROWDSTRIKE_CONNECTOR_ID);

    console.log({ connectorActionsClient });
    const body = await connectorActionsClient.execute(executeOptions);

    console.log({ body });
    return res.ok({
      body,
    });
  };
};
