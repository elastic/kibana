/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ConfigKey } from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitors, getKqlFilter } from '../common';
import { INSUFFICIENT_FLEET_PERMISSIONS } from '../../synthetics_service/project_monitor/project_monitor_formatter';
import { deleteMonitorBulk } from './bulk_cruds/delete_monitor_bulk';

export const deleteSyntheticsMonitorProjectRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE,
  validate: {
    body: schema.object({
      monitors: schema.arrayOf(schema.string()),
    }),
    params: schema.object({
      projectName: schema.string(),
    }),
  },
  handler: async ({
    request,
    response,
    savedObjectsClient,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { projectName } = request.params;
    const { monitors: monitorsToDelete } = request.body;
    const decodedProjectName = decodeURI(projectName);
    if (monitorsToDelete.length > 250) {
      return response.badRequest({
        body: {
          message: REQUEST_TOO_LARGE,
        },
      });
    }

    const { saved_objects: monitors } = await getMonitors(
      {
        filter: `${syntheticsMonitorType}.attributes.${
          ConfigKey.PROJECT_ID
        }: "${decodedProjectName}" AND ${getKqlFilter({
          field: 'journey_id',
          values: monitorsToDelete.map((id: string) => `${id}`),
        })}`,
        fields: [],
        perPage: 500,
      },
      syntheticsMonitorClient.syntheticsService,
      savedObjectsClient
    );

    const {
      integrations: { writeIntegrationPolicies },
    } = await server.fleet.authz.fromRequest(request);

    const hasPrivateMonitor = monitors.some((monitor) =>
      monitor.attributes.locations.some((location) => !location.isServiceManaged)
    );

    if (!writeIntegrationPolicies && hasPrivateMonitor) {
      return response.forbidden({
        body: {
          message: INSUFFICIENT_FLEET_PERMISSIONS,
        },
      });
    }

    await deleteMonitorBulk({
      monitors,
      server,
      savedObjectsClient,
      syntheticsMonitorClient,
      request,
    });

    return {
      deleted_monitors: monitorsToDelete,
    };
  },
});

export const REQUEST_TOO_LARGE = i18n.translate('xpack.synthetics.server.project.delete.toolarge', {
  defaultMessage:
    'Delete request payload is too large. Please send a max of 250 monitors to delete per request',
});
