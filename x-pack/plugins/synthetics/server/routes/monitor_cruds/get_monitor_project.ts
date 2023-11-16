/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { ConfigKey } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitors } from '../common';

const querySchema = schema.object({
  search_after: schema.maybe(schema.string()),
  per_page: schema.maybe(schema.number()),
});

export const getSyntheticsProjectMonitorsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT,
  validate: {
    params: schema.object({
      projectName: schema.string(),
    }),
    query: querySchema,
  },
  handler: async (routeContext): Promise<any> => {
    const {
      request,
      server: { logger },
    } = routeContext;

    const { projectName } = request.params;
    const { per_page: perPage = 500, search_after: searchAfter } = request.query;
    const decodedProjectName = decodeURI(projectName);
    const decodedSearchAfter = searchAfter ? decodeURI(searchAfter) : undefined;

    try {
      const { saved_objects: monitors, total } = await getMonitors(
        {
          ...routeContext,
          request: {
            ...request,
            query: {
              ...request.query,
              filter: `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${decodedProjectName}"`,
              perPage,
              sortField: ConfigKey.JOURNEY_ID,
              sortOrder: 'asc',
              searchAfter: decodedSearchAfter ? [...decodedSearchAfter.split(',')] : undefined,
            },
          },
        },
        {
          fields: [ConfigKey.JOURNEY_ID, ConfigKey.CONFIG_HASH],
        }
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
