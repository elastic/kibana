/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError, BadRequestError, getIndexAliases } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SetupPlugins } from '../../../../plugin';
import { DETECTION_ENGINE_SIGNALS_MIGRATION_URL } from '../../../../../common/constants';
import { createSignalsMigrationSchema } from '../../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../utils';

import { getTemplateVersion } from '../index/check_template_version';
import { signalsMigrationService } from '../../migrations/migration_service';
import { SIGNALS_TEMPLATE_VERSION } from '../index/get_signals_template';
import { isOutdated, signalsAreOutdated } from '../../migrations/helpers';
import { getIndexVersionsByIndex } from '../../migrations/get_index_versions_by_index';
import { getSignalVersionsByIndex } from '../../migrations/get_signal_versions_by_index';

export const createSignalsMigrationRoute = (
  router: SecuritySolutionPluginRouter,
  security: SetupPlugins['security']
) => {
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
      const { index: indices, ...reindexOptions } = request.body;

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const soClient = context.core.savedObjects.client;
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const user = await security?.authc.getCurrentUser(request);
        const migrationService = signalsMigrationService({
          esClient,
          soClient,
          username: user?.username ?? 'elastic',
        });

        const signalsAlias = appClient.getSignalsIndex();
        const currentVersion = await getTemplateVersion({
          alias: signalsAlias,
          esClient,
        });

        if (isOutdated({ current: currentVersion, target: SIGNALS_TEMPLATE_VERSION })) {
          throw new BadRequestError(
            `Cannot migrate due to the signals template being out of date. Latest version: [${SIGNALS_TEMPLATE_VERSION}], template version: [${currentVersion}]. Please visit Detections to automatically update your template, then try again.`
          );
        }

        const signalsIndexAliases = await getIndexAliases({ esClient, alias: signalsAlias });

        const nonSignalsIndices = indices.filter(
          (index) => !signalsIndexAliases.some((alias) => alias.index === index)
        );
        if (nonSignalsIndices.length > 0) {
          throw new BadRequestError(
            `The following indices are not signals indices and cannot be migrated: [${nonSignalsIndices.join()}].`
          );
        }

        const indexVersionsByIndex = await getIndexVersionsByIndex({ esClient, index: indices });
        const signalVersionsByIndex = await getSignalVersionsByIndex({ esClient, index: indices });

        const migrationResults = await Promise.all(
          indices.map(async (index) => {
            const indexVersion = indexVersionsByIndex[index] ?? 0;
            const signalVersions = signalVersionsByIndex[index] ?? [];

            if (
              isOutdated({ current: indexVersion, target: currentVersion }) ||
              signalsAreOutdated({ signalVersions, target: currentVersion })
            ) {
              try {
                const isWriteIndex = signalsIndexAliases.some(
                  (alias) => alias.isWriteIndex && alias.index === index
                );
                if (isWriteIndex) {
                  throw new BadRequestError(
                    'The specified index is a write index and cannot be migrated.'
                  );
                }

                const migration = await migrationService.create({
                  index,
                  reindexOptions,
                  version: currentVersion,
                });

                return {
                  index: migration.attributes.sourceIndex,
                  migration_id: migration.id,
                  migration_index: migration.attributes.destinationIndex,
                };
              } catch (err) {
                const error = transformError(err);
                return {
                  index,
                  error: {
                    message: error.message,
                    status_code: error.statusCode,
                  },
                  migration_id: null,
                  migration_index: null,
                };
              }
            } else {
              return {
                index,
                migration_id: null,
                migration_index: null,
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
