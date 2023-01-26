/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const syncParamsSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS,
  validate: {},
  writeAccess: true,
  handler: async ({
    savedObjectsClient,
    syntheticsMonitorClient,
    request,
    server,
  }): Promise<any> => {
    const spaceId = server.spaces.spacesService.getSpaceId(request);

    const allPrivateLocations = await getPrivateLocations(
      syntheticsMonitorClient,
      savedObjectsClient
    );

    await syntheticsMonitorClient.syncGlobalParams({
      request,
      spaceId,
      savedObjectsClient,
      allPrivateLocations,
      encryptedSavedObjects: server.encryptedSavedObjects,
    });

    return { success: true };
  },
});
