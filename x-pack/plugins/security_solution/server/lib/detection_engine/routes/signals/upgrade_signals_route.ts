/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_UPGRADE_SIGNALS_URL } from '../../../../../common/constants';
import { upgradeSignals } from '../../migrations/upgrade_signals';
import { buildSiemResponse, transformError } from '../utils';
import { SIGNALS_TEMPLATE_VERSION } from '../index/get_signals_template';
import { getMigrationStatus } from '../../migrations/get_migration_status';
import { indexNeedsUpgrade, signalsNeedUpgrade } from '../../migrations/helpers';

export const upgradeSignalsRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_UPGRADE_SIGNALS_URL,
      // TODO io-ts
      validate: {
        body: schema.object({ index: schema.arrayOf(schema.string()) }),
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
        const tasks = await Promise.all(
          indices.map(async (index) => {
            const status = migrationStatuses.find(({ name }) => name === index);
            if (
              indexNeedsUpgrade({ status, version: SIGNALS_TEMPLATE_VERSION }) ||
              signalsNeedUpgrade({ status, version: SIGNALS_TEMPLATE_VERSION })
            ) {
              const taskId = await upgradeSignals({
                esClient,
                index,
                version: SIGNALS_TEMPLATE_VERSION,
              });

              return { index, id: taskId };
            } else {
              return { index, id: null };
            }
          })
        );

        return response.ok({ body: { tasks } });
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
