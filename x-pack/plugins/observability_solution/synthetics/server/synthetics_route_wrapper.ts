/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { isEmpty } from 'lodash';
import { isTestUser, SyntheticsEsClient } from './lib';
import { checkIndicesReadPrivileges } from './synthetics_service/authentication/check_has_privilege';
import { SYNTHETICS_INDEX_PATTERN } from '../common/constants';
import { syntheticsServiceApiKey } from './saved_objects/service_api_key';
import { SyntheticsRouteWrapper } from './routes/types';

export const syntheticsRouteWrapper: SyntheticsRouteWrapper = (
  uptimeRoute,
  server,
  syntheticsMonitorClient
) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
    ...(uptimeRoute.options ?? {}),
  },
  handler: async (context, request, response) => {
    const { elasticsearch, savedObjects, uiSettings } = await context.core;

    const { client: esClient } = elasticsearch;
    const savedObjectsClient = savedObjects.getClient({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });

    // specifically needed for the synthetics service api key generation
    server.authSavedObjectsClient = savedObjectsClient;

    const syntheticsEsClient = new SyntheticsEsClient(savedObjectsClient, esClient.asCurrentUser, {
      request,
      uiSettings,
      isDev: Boolean(server.isDev) && !isTestUser(server),
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });

    server.syntheticsEsClient = syntheticsEsClient;

    const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    try {
      const res = await uptimeRoute.handler({
        syntheticsEsClient,
        savedObjectsClient,
        context,
        request,
        response,
        server,
        spaceId,
        syntheticsMonitorClient,
      });
      if (res instanceof KibanaResponse) {
        return res;
      }

      const inspectData = await syntheticsEsClient.getInspectData(uptimeRoute.path);

      if (Array.isArray(res)) {
        if (isEmpty(inspectData)) {
          return response.ok({
            body: res,
          });
        } else {
          return response.ok({
            body: {
              result: res,
              ...inspectData,
            },
          });
        }
      }

      return response.ok({
        body: {
          ...res,
          ...(await syntheticsEsClient.getInspectData(uptimeRoute.path)),
        },
      });
    } catch (e) {
      if (e.statusCode === 403) {
        const privileges = await checkIndicesReadPrivileges(syntheticsEsClient);
        if (!privileges.has_all_requested) {
          return response.forbidden({
            body: {
              message:
                'MissingIndicesPrivileges: You do not have permission to read from the synthetics-* indices. Please contact your administrator.',
            },
          });
        }
      }
      server.logger.error(e);
      throw e;
    }
  },
});
