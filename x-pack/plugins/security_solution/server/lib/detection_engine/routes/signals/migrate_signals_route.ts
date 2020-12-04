/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_MIGRATE_SIGNALS_URL } from '../../../../../common/constants';
import { getSignalsIndices } from '../../migrations/get_signals_indices';
import { migrateSignals } from '../../migrations/migrate_signals';
import { migrateSignalsIndices } from '../../migrations/migrate_signals_indices';
import { getSignalsTemplate, SIGNALS_TEMPLATE_VERSION } from '../index/get_signals_template';
import { buildSiemResponse, transformError } from '../utils';

export const migrateSignalsRoute = (router: IRouter) => {
  router.post(
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

      // TODO if insufficient permissions for the following actions, reject

      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const from = 'now-500d'; // TODO make a parameter
        const signalsIndex = appClient.getSignalsIndex();
        const indicesInRange = await getSignalsIndices({ esClient, index: signalsIndex, from });
        const getMappings = (index: string) => getSignalsTemplate(index).mappings;
        const indicesMigrated = await migrateSignalsIndices({
          esClient,
          getMappings,
          indices: indicesInRange,
          version: SIGNALS_TEMPLATE_VERSION,
        });

        // TODO we should maybe just run over indicesToMigrate instead of
        // indicesMigrated; just because the mappings are updated doesn't mean
        // the docs are
        const task = await migrateSignals({ esClient, indices: indicesInRange });

        return response.ok({ body: { indicesInRange, indicesMigrated, task } });
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
