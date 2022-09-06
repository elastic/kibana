/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { ProjectBrowserMonitor, Locations } from '../../../common/runtime_types';

import { UMRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { getServiceLocations } from '../../synthetics_service/get_service_locations';
import { ProjectMonitorFormatter } from '../../synthetics_service/project_monitor_formatter';

export const addSyntheticsProjectMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT,
  validate: {
    body: schema.object({
      project: schema.string(),
      keep_stale: schema.boolean(),
      monitors: schema.arrayOf(schema.any()),
    }),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const monitors = (request.body?.monitors as ProjectBrowserMonitor[]) || [];
    const spaceId = server.spaces.spacesService.getSpaceId(request);
    const { keep_stale: keepStale, project: projectId } = request.body || {};
    const locations: Locations = (await getServiceLocations(server)).locations;
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId,
      spaceId,
      keepStale,
      locations,
      encryptedSavedObjectsClient,
      savedObjectsClient,
      monitors,
      server,
    });

    await pushMonitorFormatter.configureAllProjectMonitors();

    return response.ok({
      body: {
        createdMonitors: pushMonitorFormatter.createdMonitors,
        updatedMonitors: pushMonitorFormatter.updatedMonitors,
        staleMonitors: pushMonitorFormatter.staleMonitors,
        deletedMonitors: pushMonitorFormatter.deletedMonitors,
        failedMonitors: pushMonitorFormatter.failedMonitors,
        failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
      },
    });
  },
});
