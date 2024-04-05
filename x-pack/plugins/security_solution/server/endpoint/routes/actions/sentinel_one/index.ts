/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getSentinelOneDownloadAgentFileHandler } from './download_agent_file';
import { getSentinelOneListScriptsHandler } from './list_scripts_handler';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { EndpointAppContext } from '../../../types';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../../with_endpoint_authz';

const SENTINEL_ONE_ACTIONS_GET_SCRIPTS_ROUTE = `/internal${BASE_ENDPOINT_ACTION_ROUTE}/sentinel_one/scripts`;
const SENTINEL_ONE_ACTIONS_DOWNLOAD_AGENT_FILE_ROUTE = `/internal${BASE_ENDPOINT_ACTION_ROUTE}/sentinel_one/file/{agentUUID}/{activityId}`;

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

  router.versioned
    .get({
      access: 'internal',
      path: SENTINEL_ONE_ACTIONS_DOWNLOAD_AGENT_FILE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
      // NOTE:
      // Because this API is used in the browser via `href` (ex. on link to download a file),
      // we need to enable setting the version number via query params
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              agentUUID: schema.string(),
              activityId: schema.string(),
            }),
          },
        },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        getSentinelOneDownloadAgentFileHandler(endpointContext)
      )
    );
};
