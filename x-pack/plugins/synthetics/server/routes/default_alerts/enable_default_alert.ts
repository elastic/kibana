/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusAlertService } from './status_alert_service';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const enableDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  writeAccess: true,
  handler: async ({ context, server, savedObjectsClient }): Promise<any> => {
    const statusAlertService = new StatusAlertService(context, server, savedObjectsClient);

    return await statusAlertService.createDefaultAlertIfNotExist();
  },
});
