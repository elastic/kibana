/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { syncSpaceGlobalParams } from '../../../synthetics_service/sync_global_params';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { DeleteParamsResponse } from '../../../../common/runtime_types';

export const deleteSyntheticsParamsBulkRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  unknown,
  unknown,
  { ids: string[] }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PARAMS + '/_bulk_delete',
  validate: {},
  validation: {
    request: {
      body: schema.object({
        ids: schema.arrayOf(schema.string()),
      }),
    },
  },
  handler: async ({ savedObjectsClient, request, server, spaceId, syntheticsMonitorClient }) => {
    const { ids } = request.body;

    const result = await savedObjectsClient.bulkDelete(
      ids.map((id) => ({ type: syntheticsParamType, id })),
      { force: true }
    );

    void syncSpaceGlobalParams({
      spaceId,
      logger: server.logger,
      encryptedSavedObjects: server.encryptedSavedObjects,
      savedObjects: server.coreStart.savedObjects,
      syntheticsMonitorClient,
    });

    return result.statuses.map(({ id, success }) => ({ id, deleted: success }));
  },
});
