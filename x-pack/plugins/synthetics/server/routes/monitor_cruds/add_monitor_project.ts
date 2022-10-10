/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { ProjectMonitor } from '../../../common/runtime_types';

import { SyntheticsStreamingRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { ProjectMonitorFormatter } from '../../synthetics_service/project_monitor/project_monitor_formatter';

const MAX_PAYLOAD_SIZE = 1048576 * 20; // 20MiB

export const addSyntheticsProjectMonitorRoute: SyntheticsStreamingRouteFactory = (
  libs: UMServerLibs
) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT,
  validate: {
    body: schema.object({
      project: schema.string(),
      keep_stale: schema.boolean(),
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
    subject,
  }): Promise<any> => {
    try {
      const monitors = (request.body?.monitors as ProjectMonitor[]) || [];
      const spaceId = server.spaces.spacesService.getSpaceId(request);
      const { keep_stale: keepStale, project: projectId } = request.body || {};
      const { publicLocations, privateLocations } = await getAllLocations(
        server,
        syntheticsMonitorClient,
        savedObjectsClient
      );
      const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

      const pushMonitorFormatter = new ProjectMonitorFormatter({
        projectId,
        spaceId,
        keepStale,
        locations: publicLocations,
        privateLocations,
        encryptedSavedObjectsClient,
        savedObjectsClient,
        monitors,
        server,
        syntheticsMonitorClient,
        request,
        subject,
      });

      await pushMonitorFormatter.configureAllProjectMonitors();

      subject?.next({
        createdMonitors: pushMonitorFormatter.createdMonitors,
        updatedMonitors: pushMonitorFormatter.updatedMonitors,
        staleMonitors: pushMonitorFormatter.staleMonitors,
        deletedMonitors: pushMonitorFormatter.deletedMonitors,
        failedMonitors: pushMonitorFormatter.failedMonitors,
        failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
      });
    } catch (error) {
      subject?.error(error);
    } finally {
      subject?.complete();
    }
  },
});
