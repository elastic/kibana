/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { ProjectMonitor } from '../../../common/runtime_types';

import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { ProjectMonitorFormatter } from '../../synthetics_service/project_monitor/project_monitor_formatter';

const MAX_PAYLOAD_SIZE = 1048576 * 20; // 20MiB

export const addSyntheticsProjectMonitorRoute: SyntheticsRestApiRouteFactory = (
  libs: UMServerLibs
) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT,
  validate: {
    params: schema.object({
      projectName: schema.string(),
    }),
    body: schema.object({
      monitors: schema.arrayOf(schema.any()),
    }),
  },
  options: {
    body: {
      maxBytes: MAX_PAYLOAD_SIZE,
    },
  },
  handler: async ({
    request,
    savedObjectsClient,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { projectName } = request.params;
    const decodedProjectName = decodeURI(projectName);
    try {
      const monitors = (request.body?.monitors as ProjectMonitor[]) || [];
      const spaceId = server.spaces.spacesService.getSpaceId(request);
      const { publicLocations, privateLocations } = await getAllLocations(
        server,
        syntheticsMonitorClient,
        savedObjectsClient
      );
      const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

      const pushMonitorFormatter = new ProjectMonitorFormatter({
        projectId: decodedProjectName,
        spaceId,
        locations: publicLocations,
        privateLocations,
        encryptedSavedObjectsClient,
        savedObjectsClient,
        monitors,
        server,
        syntheticsMonitorClient,
        request,
      });

      await pushMonitorFormatter.configureAllProjectMonitors();

      return {
        createdMonitors: pushMonitorFormatter.createdMonitors,
        updatedMonitors: pushMonitorFormatter.updatedMonitors,
        failedMonitors: pushMonitorFormatter.failedMonitors,
      };
    } catch (error) {
      server.logger.error(`Error adding monitors to project ${decodedProjectName}`);
      throw error;
    }
  },
});
