/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedScriptsRequestSchema } from '../../../../common/api/endpoint/saved_scripts/create_saved_scripts';
import {
  CREATE_ENDPOINT_SAVED_SCRIPTS_ROUTE,
  GET_ENDPOINT_SAVED_SCRIPTS_ROUTE,
  LIST_ENDPOINT_SAVED_SCRIPTS_ROUTE,
} from '../../../../common/endpoint/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { createSavedScriptRequestHandler } from './create_saved_scripts_handler';
import { listSavedScriptRequestHandler } from './list_saved_scripts_handler';
import { getSavedScriptRequestHandler } from './get_saved_scripts_handler';
export const registerSavedScriptsRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('endpoint_action_list');

  router.versioned
    .post({
      access: 'public',
      path: CREATE_ENDPOINT_SAVED_SCRIPTS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: SavedScriptsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        createSavedScriptRequestHandler<any>(endpointContext)
      )
    );

  router.versioned
    .get({
      access: 'public',
      path: LIST_ENDPOINT_SAVED_SCRIPTS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: SavedScriptsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        listSavedScriptRequestHandler<any>(endpointContext)
      )
    );

  router.versioned
    .get({
      access: 'public',
      path: GET_ENDPOINT_SAVED_SCRIPTS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: SavedScriptsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        getSavedScriptRequestHandler<any>(endpointContext)
      )
    );
};
