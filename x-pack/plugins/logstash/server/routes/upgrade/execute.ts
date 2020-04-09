/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ICustomClusterClient, IRouter } from 'src/core/server';
import { licenseCheckerRouteHandlerWrapper } from '../../../../licensing/server';

import { INDEX_NAMES } from '../../../common/constants';
import { checkLicense } from '../../lib/check_license';

export function registerUpgradeRoute(router: IRouter, esClient: ICustomClusterClient) {
  router.post(
    {
      path: '/api/logstash/upgrade',
      validate: false,
    },
    licenseCheckerRouteHandlerWrapper(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        const client = esClient.asScoped(request);

        const doesIndexExist = await client.callAsCurrentUser('indices.exists', {
          index: INDEX_NAMES.PIPELINES,
        });

        // If index doesn't exist yet, there is no mapping to upgrade
        if (doesIndexExist) {
          await client.callAsCurrentUser('indices.putMapping', {
            index: INDEX_NAMES.PIPELINES,
            body: {
              properties: {
                pipeline_settings: {
                  dynamic: false,
                  type: 'object',
                },
              },
            },
          });
        }

        return response.ok({ body: { is_upgraded: true } });
      })
    )
  );
}
