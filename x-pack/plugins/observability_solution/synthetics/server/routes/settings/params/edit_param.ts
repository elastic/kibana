/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { validateRouteSpaceName } from '../../common';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SyntheticsParamRequest, SyntheticsParams } from '../../../../common/runtime_types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

const RequestParamsSchema = schema.object({
  id: schema.string(),
});

type RequestParams = TypeOf<typeof RequestParamsSchema>;

export const editSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsParams | undefined,
  RequestParams
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id}',
  validate: {},
  validation: {
    request: {
      params: RequestParamsSchema,
      body: schema.object({
        key: schema.maybe(
          schema.string({
            minLength: 1,
          })
        ),
        value: schema.maybe(
          schema.string({
            minLength: 1,
          })
        ),
        description: schema.maybe(schema.string()),
        tags: schema.maybe(schema.arrayOf(schema.string())),
      }),
    },
  },
  handler: async (routeContext) => {
    const { savedObjectsClient, request, response, spaceId, server } = routeContext;
    const { invalidResponse } = await validateRouteSpaceName(routeContext);
    if (invalidResponse) return invalidResponse;

    const { id: paramId } = request.params;
    const data = request.body as SyntheticsParamRequest;
    if (isEmpty(data)) {
      return response.badRequest({ body: { message: 'Request body cannot be empty' } });
    }
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

    try {
      const existingParam =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsParams>(
          syntheticsParamType,
          paramId,
          { namespace: spaceId }
        );

      const newParam = {
        ...existingParam.attributes,
        ...data,
      };

      // value from data since we aren't using encrypted client
      const { value } = existingParam.attributes;
      const {
        id: responseId,
        attributes: { key, tags, description },
        namespaces,
      } = (await savedObjectsClient.update<SyntheticsParams>(
        syntheticsParamType,
        paramId,
        newParam
      )) as SavedObject<SyntheticsParams>;

      return { id: responseId, key, tags, description, namespaces, value };
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return response.notFound({ body: { message: 'Param not found' } });
      }
    }
  },
});
