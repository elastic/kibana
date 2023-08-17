/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DeleteParamsResponse } from '../../../common/runtime_types';

export const deleteSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {
    query: schema.object({
      ids: schema.string(),
    }),
  },
  writeAccess: true,
  handler: async ({
    savedObjectsClient,
    request,
    response,
  }): Promise<IKibanaResponse<DeleteParamsResponse[]>> => {
    const { ids } = request.query as { ids: string };
    const parsedIds = JSON.parse(ids) as string[];

    const result = await savedObjectsClient.bulkDelete(
      parsedIds.map((id) => ({ type: syntheticsParamType, id })),
      { force: true }
    );
    return response.ok({
      body: result.statuses.map(({ id, success }) => ({ id, deleted: success })),
    });
  },
});
