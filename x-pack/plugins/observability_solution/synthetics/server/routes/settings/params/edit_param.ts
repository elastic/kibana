/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObject } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SyntheticsParamRequest, SyntheticsParams } from '../../../../common/runtime_types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

const RequestParamsSchema = schema.object({
  id: schema.string(),
});

type RequestParams = TypeOf<typeof RequestParamsSchema>;

export const editSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsParams,
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
  handler: async ({ savedObjectsClient, request, server, response }) => {
    try {
      const { id: _spaceId } = (await server.spaces?.spacesService.getActiveSpace(request)) ?? {
        id: DEFAULT_SPACE_ID,
      };
      const { id } = request.params;
      const { share_across_spaces: _shareAcrossSpaces, ...data } =
        request.body as SyntheticsParamRequest & {
          id: string;
        };

      const { value } = data;
      const {
        id: responseId,
        attributes: { key, tags, description },
        namespaces,
      } = (await savedObjectsClient.update(
        syntheticsParamType,
        id,
        data
      )) as SavedObject<SyntheticsParams>;

      return { id: responseId, key, tags, description, namespaces, value };
    } catch (error) {
      if (error.output?.statusCode === 404) {
        const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        return response.notFound({
          body: { message: `Kibana space '${spaceId}' does not exist` },
        });
      }

      throw error;
    }
  },
});
