/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';

export const editSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'PUT',
  path: API_URLS.EDIT_MONITOR,
  validate: {},
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const monitor = request.body as SyntheticsMonitorSavedObject;

    const editMonitor = await savedObjectsClient.update(
      syntheticsMonitorType,
      monitor.id,
      monitor.attributes
    );
    // TODO: call to service sync
    return editMonitor;
  },
});
