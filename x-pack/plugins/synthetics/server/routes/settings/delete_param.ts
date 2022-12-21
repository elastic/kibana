/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const deleteSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {
    body: schema.object({
      ids: schema.arrayOf(schema.string()),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    const { ids } = request.body as { ids: string[] };

    const result = await savedObjectsClient.bulkDelete(
      ids.map((id) => ({ type: syntheticsParamType, id })),
      { force: true }
    );

    return { data: result };
  },
});
