/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SyntheticsRestApiRouteFactory } from '../types';
import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const syncParamsSyntheticsParamsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS,
  validate: {},
  handler: async ({
    savedObjectsClient,
    syntheticsMonitorClient,
    request,
    server,
  }): Promise<any> => {
    const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    const allPrivateLocations = await getPrivateLocations(savedObjectsClient);

    await syntheticsMonitorClient.syncGlobalParams({
      spaceId,
      allPrivateLocations,
      encryptedSavedObjects: server.encryptedSavedObjects,
    });

    return { success: true };
  },
});
