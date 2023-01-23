/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ProjectMonitor } from '../../../common/runtime_types';

import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { ProjectMonitorFormatter } from '../../synthetics_service/project_monitor/project_monitor_formatter';

const MAX_PAYLOAD_SIZE = 1048576 * 20; // 20MiB

export const addSyntheticsProjectMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE,
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
    context,
    request,
    response,
    savedObjectsClient,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { projectName } = request.params;
    const decodedProjectName = decodeURI(projectName);
    const monitors = (request.body?.monitors as ProjectMonitor[]) || [];

    if (monitors.length > 250) {
      return response.badRequest({
        body: {
          message: REQUEST_TOO_LARGE,
        },
      });
    }

    try {
      const { id: spaceId } = await server.spaces.spacesService.getActiveSpace(request);
      const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

      const pushMonitorFormatter = new ProjectMonitorFormatter({
        projectId: decodedProjectName,
        spaceId,
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
      if (error.output.statusCode === 404) {
        return response.notFound({ body: { message: 'Kibana space does not exist' } });
      }

      throw error;
    }
  },
});

export const REQUEST_TOO_LARGE = i18n.translate('xpack.synthetics.server.project.delete.toolarge', {
  defaultMessage:
    'Delete request payload is too large. Please send a max of 250 monitors to delete per request',
});
