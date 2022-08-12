/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';

export const getServiceAllowedRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SERVICE_ALLOWED,
  validate: {},
  handler: async ({ syntheticsMonitorClient }): Promise<any> => {
    return {
      serviceAllowed: syntheticsMonitorClient.syntheticsService.isAllowed,
      signupUrl: syntheticsMonitorClient.syntheticsService.signupUrl,
    };
  },
});
