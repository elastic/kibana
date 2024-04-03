/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSentinelOneListScriptsHandler } from './list_scripts_handler';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { EndpointAppContext } from '../../../types';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../../with_endpoint_authz';

const SENTINEL_ONE_ACTIONS_GET_SCRIPTS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/sentinel_one/scripts`;

export const registerSentinelOneRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('SentinelOneResponseActions');

  router.versioned
    .get({
      access: 'internal',
      path: SENTINEL_ONE_ACTIONS_GET_SCRIPTS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '1',
        validate: false, // POC code
      },
      withEndpointAuthz(
        { all: ['canIsolateHost'] },
        logger,
        getSentinelOneListScriptsHandler(endpointContext)
      )
    );
};
