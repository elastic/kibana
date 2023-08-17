/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { IKibanaResponse } from '@kbn/core/server';
import { SyntheticsRestApiRouteFactory } from '../types';
import {
  SyntheticsParamRequest,
  SyntheticsParams,
  SyntheticsParamSOAttributes,
} from '../../../common/runtime_types';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const addSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {
    body: schema.object({
      key: schema.string(),
      value: schema.string(),
      description: schema.maybe(schema.string()),
      tags: schema.maybe(schema.arrayOf(schema.string())),
      share_across_spaces: schema.maybe(schema.boolean()),
    }),
  },
  writeAccess: true,
  handler: async ({
    request,
    response,
    server,
    savedObjectsClient,
  }): Promise<IKibanaResponse<SyntheticsParams>> => {
    try {
      const { id: spaceId } = (await server.spaces?.spacesService.getActiveSpace(request)) ?? {
        id: DEFAULT_SPACE_ID,
      };
      const { share_across_spaces: shareAcrossSpaces, ...data } =
        request.body as SyntheticsParamRequest;

      const {
        attributes: { key, tags, description },
        id,
        namespaces,
      } = await savedObjectsClient.create<Omit<SyntheticsParamSOAttributes, 'id'>>(
        syntheticsParamType,
        data,
        {
          initialNamespaces: shareAcrossSpaces ? [ALL_SPACES_ID] : [spaceId],
        }
      );
      return response.ok({
        body: {
          id,
          description,
          key,
          namespaces,
          tags,
          value: data.value,
        },
      });
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
