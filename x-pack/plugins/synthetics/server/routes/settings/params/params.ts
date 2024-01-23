/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { schema, TypeOf } from '@kbn/config-schema';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { SyntheticsParams, SyntheticsParamsReadonly } from '../../../../common/runtime_types';

const RequestParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});

type RequestParams = TypeOf<typeof RequestParamsSchema>;

export const getSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsParams[] | SyntheticsParamsReadonly[] | SyntheticsParams | SyntheticsParamsReadonly,
  RequestParams
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id?}',
  validate: {},
  validation: {
    request: {
      params: RequestParamsSchema,
    },
  },
  handler: async ({ savedObjectsClient, request, response, server, spaceId }) => {
    try {
      const { id: paramId } = request.params;

      const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

      const canSave =
        (
          await server.coreStart?.capabilities.resolveCapabilities(request, {
            capabilityPath: 'uptime.*',
          })
        ).uptime.save ?? false;

      if (canSave) {
        if (paramId) {
          const savedObject =
            await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsParams>(
              syntheticsParamType,
              paramId,
              { namespace: spaceId }
            );
          return toClientResponse(savedObject);
        }

        const finder =
          await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParams>(
            {
              type: syntheticsParamType,
              perPage: 1000,
              namespaces: [spaceId],
            }
          );

        const hits: Array<SavedObjectsFindResult<SyntheticsParams>> = [];
        for await (const result of finder.find()) {
          hits.push(...result.saved_objects);
        }

        return hits.map((savedObject) => toClientResponse(savedObject));
      } else {
        if (paramId) {
          const savedObject = await savedObjectsClient.get<SyntheticsParamsReadonly>(
            syntheticsParamType,
            paramId
          );
          return toClientResponse(savedObject);
        }

        const data = await savedObjectsClient.find<SyntheticsParamsReadonly>({
          type: syntheticsParamType,
          perPage: 10000,
        });
        return data.saved_objects.map((savedObject) => toClientResponse(savedObject));
      }
    } catch (error) {
      if (error.output?.statusCode === 404) {
        return response.notFound({ body: { message: `Kibana space '${spaceId}' does not exist` } });
      }

      throw error;
    }
  },
});

const toClientResponse = (
  savedObject: SavedObject<SyntheticsParams | SyntheticsParamsReadonly>
) => {
  const { id, attributes, namespaces } = savedObject;
  return {
    ...attributes,
    id,
    namespaces,
  };
};
