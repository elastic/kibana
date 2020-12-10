/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL } from '../../../../../common/constants';
import { getMigrationStatusSchema } from '../../../../../common/detection_engine/schemas/request/get_migration_status_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { getIndexAliases } from '../../index/get_index_aliases';
import { getMigrationStatus } from '../../migrations/get_migration_status';
import { getSignalsIndicesInRange } from '../../migrations/get_signals_indices_in_range';
import { indexIsOutdated } from '../../migrations/helpers';
import { getTemplateVersion } from '../index/check_template_version';
import { buildSiemResponse, transformError } from '../utils';

export const getSignalsMigrationStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
      validate: {
        query: buildRouteValidation(getMigrationStatusSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const soClient = context.core.savedObjects.client;

      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const { from } = request.query;

        const signalsAlias = appClient.getSignalsIndex();
        const currentVersion = await getTemplateVersion({ alias: signalsAlias, esClient });
        const indexAliases = await getIndexAliases({ alias: signalsAlias, esClient });
        const signalsIndices = indexAliases.map((indexAlias) => indexAlias.index);
        const indicesInRange = await getSignalsIndicesInRange({
          esClient,
          index: signalsIndices,
          from,
        });
        const migrationStatuses = await getMigrationStatus({
          esClient,
          index: indicesInRange,
          soClient,
        });
        const enrichedStatuses = migrationStatuses.map((status) => ({
          ...status,
          is_outdated: indexIsOutdated({ status, version: currentVersion }),
        }));

        return response.ok({ body: { indices: enrichedStatuses } });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
