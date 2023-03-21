/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {},
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

    const spaceId = server.spaces.spacesService.getSpaceId(request);

    const canSave =
      (await server.coreStart?.capabilities.resolveCapabilities(request)).uptime.save ?? false;

    if (canSave) {
      const finder =
        await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser({
          type: syntheticsParamType,
          perPage: 1000,
          namespaces: [spaceId],
        });

      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
      }

      return { data: hits };
    } else {
      const data = await savedObjectsClient.find({
        type: syntheticsParamType,
        perPage: 10000,
      });

      return { data: data.saved_objects };
    }
  },
});
