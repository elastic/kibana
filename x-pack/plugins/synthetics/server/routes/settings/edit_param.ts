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

export const editSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {
    body: schema.object({
      id: schema.string(),
      key: schema.string(),
      value: schema.string(),
      description: schema.maybe(schema.string()),
      tags: schema.maybe(schema.arrayOf(schema.string())),
      namespaces: schema.maybe(schema.arrayOf(schema.string())),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    const { namespaces, id, ...data } = request.body as SyntheticsParam & { id: string };

    const result = await savedObjectsClient.update(syntheticsParamType, id, data);

    return { data: result };
  },
});
