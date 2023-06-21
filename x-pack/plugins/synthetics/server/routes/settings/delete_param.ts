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
    query: schema.object({
      ids: schema.string(),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request }): Promise<any> => {
    const { ids } = request.query as { ids: string };
    const parsedIds = JSON.parse(ids) as string[];

    const result = await savedObjectsClient.bulkDelete(
      parsedIds.map((id) => ({ type: syntheticsParamType, id })),
      { force: true }
    );

    return { data: result };
  },
});
