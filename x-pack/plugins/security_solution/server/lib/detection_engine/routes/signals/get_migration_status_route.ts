/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_MIGRATE_SIGNALS_URL } from '../../../../../common/constants';
import { getIndexAliases } from '../../index/get_index_aliases';
import { getMigrationStatus } from '../../migrations/get_migration_status';
import { getSignalsIndicesInRange } from '../../migrations/get_signals_indices_in_range';
import { buildSiemResponse, transformError } from '../utils';

export const getMigrationStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_MIGRATE_SIGNALS_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = context.core.elasticsearch.client.asCurrentUser;

      // TODO permissions check
      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const from = 'now-500d'; // TODO make a parameter

        const signalsAlias = appClient.getSignalsIndex();
        const indexAliases = await getIndexAliases({ alias: signalsAlias, esClient });
        const nonWriteIndices = indexAliases
          .filter((indexAlias) => !indexAlias.isWriteIndex)
          .map((indexAlias) => indexAlias.index);
        const indicesInRange = await getSignalsIndicesInRange({
          esClient,
          index: nonWriteIndices,
          from,
        });
        const migrationStatuses = await getMigrationStatus({ esClient, index: indicesInRange });

        return response.ok({ body: { indices: migrationStatuses } });
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
