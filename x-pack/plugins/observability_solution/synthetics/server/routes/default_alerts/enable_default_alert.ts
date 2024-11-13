/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DefaultAlertService } from './default_alert_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';

export const enableDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {
    request: {
      body: schema.object({
        enableTls: schema.boolean(),
        enableMonitorStatus: schema.boolean(),
      }),
    },
  },
  handler: async ({
    context,
    request,
    server,
    savedObjectsClient,
  }): Promise<DEFAULT_ALERT_RESPONSE> => {
    const { enableTls, enableMonitorStatus } = request.body;
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);

    return defaultAlertService.setupDefaultAlerts({ enableTls, enableMonitorStatus });
  },
});
