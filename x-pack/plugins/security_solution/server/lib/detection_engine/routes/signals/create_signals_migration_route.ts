/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_MIGRATION_URL } from '../../../../../common/constants';
import { createSignalsMigrationSchema } from '../../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { migrateSignals } from '../../migrations/migrate_signals';
import { buildSiemResponse, transformError } from '../utils';
import { SIGNALS_TEMPLATE_VERSION } from '../index/get_signals_template';
import { getMigrationStatus } from '../../migrations/get_migration_status';
import {
  encodeMigrationToken,
  indexNeedsMigration,
  signalsNeedMigration,
} from '../../migrations/helpers';

export const createSignalsMigrationRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
      // TODO add reindex parameters
      validate: {
        body: buildRouteValidation(createSignalsMigrationSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const indices = request.body.index;

      // TODO permissions check
      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const migrationStatuses = await getMigrationStatus({ esClient, index: indices });

        const migrationResults = await Promise.all(
          indices.map(async (index) => {
            const status = migrationStatuses.find(({ name }) => name === index);
            if (
              indexNeedsMigration({ status, version: SIGNALS_TEMPLATE_VERSION }) ||
              signalsNeedMigration({ status, version: SIGNALS_TEMPLATE_VERSION })
            ) {
              const migrationDetails = await migrateSignals({
                esClient,
                index,
                version: SIGNALS_TEMPLATE_VERSION,
              });
              const migrationToken = encodeMigrationToken(migrationDetails);

              return {
                index,
                migration_index: migrationDetails.destinationIndex,
                migration_task_id: migrationDetails.taskId,
                migration_token: migrationToken,
              };
            } else {
              return {
                index,
                migration_index: null,
                migration_task_id: null,
                migration_token: null,
              };
            }
          })
        );

        return response.ok({ body: { indices: migrationResults } });
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
