/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SyntheticsParam } from '../../../common/runtime_types';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
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
      namespaces: schema.maybe(schema.arrayOf(schema.string())),
    }),
  },
  writeAccess: true,
  handler: async ({ request, server, savedObjectsClient }): Promise<any> => {
    const { namespaces, ...data } = request.body as SyntheticsParam;
    const { id: spaceId } = await server.spaces.spacesService.getActiveSpace(request);

    const result = await savedObjectsClient.create(syntheticsParamType, data, {
      initialNamespaces: (namespaces ?? []).length > 0 ? namespaces : [spaceId],
    });

    return { data: result };
  },
});
