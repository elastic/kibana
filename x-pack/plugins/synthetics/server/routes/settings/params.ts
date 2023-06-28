/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse } from '@kbn/core/server';
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { SyntheticsParams, SyntheticsParamsReadonly } from '../../../common/runtime_types';

export const getSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {},
  handler: async ({
    savedObjectsClient,
    request,
    response,
    server,
  }): Promise<
    IKibanaResponse<SyntheticsParams[]> | IKibanaResponse<SyntheticsParamsReadonly[]>
  > => {
    try {
      const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

      const { id: spaceId } = (await server.spaces?.spacesService.getActiveSpace(request)) ?? {
        id: DEFAULT_SPACE_ID,
      };

      const canSave =
        (await server.coreStart?.capabilities.resolveCapabilities(request)).uptime.save ?? false;

      if (canSave) {
        const finder =
          await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<
            SyntheticsParams,
            unknown
          >({
            type: syntheticsParamType,
            perPage: 1000,
            namespaces: [spaceId],
          });

        const hits: Array<SavedObjectsFindResult<SyntheticsParams>> = [];
        for await (const result of finder.find()) {
          hits.push(...result.saved_objects);
        }

        return response.ok({
          body: hits.map(({ id, attributes: { key, value, description, tags }, namespaces }) => ({
            id,
            key,
            value,
            description,
            namespaces,
            tags,
          })),
        });
      } else {
        const data = await savedObjectsClient.find<SyntheticsParamsReadonly, unknown>({
          type: syntheticsParamType,
          perPage: 10000,
        });
        return response.ok({
          body: data.saved_objects.map(
            ({ id, attributes: { key, description, tags }, namespaces }) => ({
              id,
              key,
              description,
              namespaces,
              tags,
            })
          ),
        });
      }
    } catch (error) {
      if (error.output?.statusCode === 404) {
        const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        return response.notFound({ body: { message: `Kibana space '${spaceId}' does not exist` } });
      }

      throw error;
    }
  },
});
