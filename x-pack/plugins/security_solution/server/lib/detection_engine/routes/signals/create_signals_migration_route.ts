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
import { getTemplateVersion } from '../index/check_template_version';
import { getMigrationStatus } from '../../migrations/get_migration_status';
import { encodeMigrationToken, indexIsOutdated } from '../../migrations/helpers';
import { getIndexAliases } from '../../index/get_index_aliases';
import { BadRequestError } from '../../errors/bad_request_error';

export const createSignalsMigrationRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
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
      const { index: indices, ...reindexOptions } = request.body;

      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const signalsAlias = appClient.getSignalsIndex();
        const currentVersion = await getTemplateVersion({
          alias: signalsAlias,
          esClient,
        });
        const signalsIndexAliases = await getIndexAliases({ esClient, alias: signalsAlias });

        const nonSignalsIndices = indices.filter(
          (index) => !signalsIndexAliases.some((alias) => alias.index === index)
        );
        if (nonSignalsIndices.length > 0) {
          throw new BadRequestError(
            `The following indices are not signals indices and cannot be migrated: [${nonSignalsIndices.join()}].`
          );
        }

        const migrationStatuses = await getMigrationStatus({ esClient, index: indices });
        const migrationResults = await Promise.all(
          indices.map(async (index) => {
            const status = migrationStatuses.find(({ name }) => name === index);
            if (indexIsOutdated({ status, version: currentVersion })) {
              try {
                const isWriteIndex = signalsIndexAliases.some(
                  (alias) => alias.isWriteIndex && alias.index === index
                );
                if (isWriteIndex) {
                  throw new BadRequestError(
                    'The specified index is a write index and cannot be migrated.'
                  );
                }

                const migrationDetails = await migrateSignals({
                  esClient,
                  index,
                  version: currentVersion,
                  reindexOptions,
                });
                const migrationToken = encodeMigrationToken(migrationDetails);

                return {
                  index,
                  migration_index: migrationDetails.destinationIndex,
                  migration_task_id: migrationDetails.taskId,
                  migration_token: migrationToken,
                };
              } catch (err) {
                const error = transformError(err);
                return {
                  index,
                  error: {
                    message: error.message,
                    status_code: error.statusCode,
                  },
                  migration_index: null,
                  migration_task_id: null,
                  migration_token: null,
                };
              }
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
