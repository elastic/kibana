/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { ConfigKey } from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitors } from '../common';

const querySchema = schema.object({
  after_id: schema.maybe(schema.string()),
  size: schema.maybe(schema.number()),
});

export const getSyntheticsProjectMonitorsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
  validate: {
    params: schema.object({
      projectName: schema.string(),
    }),
    query: querySchema,
  },
  handler: async ({
    request,
    response,
    server: { logger },
    savedObjectsClient,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { projectName } = request.params;
    const { size = 500, after_id: afterId } = request.query;
    const decodedProjectName = decodeURI(projectName);
    const decodedAfterId = afterId ? decodeURI(afterId) : undefined;

    try {
      const { saved_objects: monitors } = await getMonitors(
        {
          filter: `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${decodedProjectName}"`,
          fields: [ConfigKey.JOURNEY_ID, ConfigKey.CONFIG_HASH],
          perPage: size,
          sortField: ConfigKey.JOURNEY_ID,
          sortOrder: 'asc',
          searchAfter: decodedAfterId ? [...decodedAfterId.split(',')] : undefined,
        },
        syntheticsMonitorClient.syntheticsService,
        savedObjectsClient
      );
      const projectMonitors = monitors
        .map((monitor) => {
          return JSON.stringify({
            journey_id: monitor.attributes[ConfigKey.JOURNEY_ID],
            hash: monitor.attributes[ConfigKey.CONFIG_HASH] || '',
            monitor_id: monitor.id,
            afterKey: monitor.sort,
          });
        })
        .join('\n');

      return response.ok({
        body: projectMonitors,
        headers: {
          'Content-Type': 'application/ndjson',
        },
      });
    } catch (error) {
      logger.error(error);
    }
  },
});
