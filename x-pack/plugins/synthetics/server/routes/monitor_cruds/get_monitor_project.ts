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
  search_after: schema.maybe(schema.string()),
  per_page: schema.maybe(schema.number()),
});

export const getSyntheticsProjectMonitorsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT,
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
    const { per_page: perPage = 500, search_after: searchAfter } = request.query;
    const decodedProjectName = decodeURI(projectName);
    const decodedSearchAfter = searchAfter ? decodeURI(searchAfter) : undefined;

    try {
      const { saved_objects: monitors, total } = await getMonitors(
        {
          filter: `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${decodedProjectName}"`,
          fields: [ConfigKey.JOURNEY_ID, ConfigKey.CONFIG_HASH],
          perPage,
          sortField: ConfigKey.JOURNEY_ID,
          sortOrder: 'asc',
          searchAfter: decodedSearchAfter ? [...decodedSearchAfter.split(',')] : undefined,
        },
        syntheticsMonitorClient.syntheticsService,
        savedObjectsClient
      );
      const projectMonitors = monitors.map((monitor) => ({
        journey_id: monitor.attributes[ConfigKey.JOURNEY_ID],
        hash: monitor.attributes[ConfigKey.CONFIG_HASH] || '',
      }));

      return {
        total,
        after_key: monitors.length ? monitors[monitors.length - 1].sort?.join(',') : null,
        monitors: projectMonitors,
      };
    } catch (error) {
      logger.error(error);
    }
  },
});
