/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';

export const getSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.GET_MONITOR,
  validate: {},
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    return await savedObjectsClient.find({ type: syntheticsMonitorType });
  },
});
