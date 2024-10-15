/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
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
        key: schema.string(),
        value: schema.string(),
        description: schema.maybe(schema.string()),
        tags: schema.maybe(schema.arrayOf(schema.string())),
        share_across_spaces: schema.maybe(schema.boolean()),
      }),
    },
  },
  handler: async (routeContext) => {
    const { savedObjectsClient, request, response } = routeContext;
    const { invalidResponse } = await validateRouteSpaceName(routeContext);
    if (invalidResponse) return invalidResponse;

    const { id } = request.params;
    const data = request.body as SyntheticsParamRequest;
    try {
      const existingParam = await savedObjectsClient.get<SyntheticsParams>(syntheticsParamType, id);

      const newParam = {
        ...existingParam.attributes,
        ...data,
      };

      // value from data since we aren't using encrypted client
      const { value } = data;
      const {
        id: responseId,
        attributes: { key, tags, description },
        namespaces,
      } = (await savedObjectsClient.update<SyntheticsParams>(
        syntheticsParamType,
        id,
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
