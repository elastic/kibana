/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_UPGRADE_URL } from '../../../../../common/constants';
import { upgradeSignalsSchema } from '../../../../../common/detection_engine/schemas/request/upgrade_signals_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { upgradeSignals } from '../../migrations/upgrade_signals';
import { buildSiemResponse, transformError } from '../utils';
import { SIGNALS_TEMPLATE_VERSION } from '../index/get_signals_template';
import { getMigrationStatus } from '../../migrations/get_migration_status';
import { indexNeedsUpgrade, signalsNeedUpgrade } from '../../migrations/helpers';

export const upgradeSignalsRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_SIGNALS_UPGRADE_URL,
      validate: {
        body: buildRouteValidation(upgradeSignalsSchema),
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

        // TODO parallelize
        const upgradeResults = await Promise.all(
          indices.map(async (index) => {
            const status = migrationStatuses.find(({ name }) => name === index);
            if (
              indexNeedsUpgrade({ status, version: SIGNALS_TEMPLATE_VERSION }) ||
              signalsNeedUpgrade({ status, version: SIGNALS_TEMPLATE_VERSION })
            ) {
              const { destinationIndex, sourceIndex, taskId } = await upgradeSignals({
                esClient,
                index,
                version: SIGNALS_TEMPLATE_VERSION,
              });

              return {
                destination_index: destinationIndex,
                source_index: sourceIndex,
                task_id: taskId,
              };
            } else {
              return { destination_index: null, source_index: index, task_id: null };
            }
          })
        );

        return response.ok({ body: { indices: upgradeResults } });
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
