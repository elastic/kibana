/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { ElasticsearchConfigType } from '../../common/types';
import { ELASTICSEARCH_CONFIG_ROUTE } from '../../common/constants';

export function setElasticsearchRoute({
  elasticsearchUrl,
  logger,
  router,
}: {
  elasticsearchUrl?: string;
  logger: Logger;
  router: IRouter;
}) {
  router.versioned
    .get({
      path: ELASTICSEARCH_CONFIG_ROUTE,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {},
      },
      async (context, request, response) => {
        const body: ElasticsearchConfigType = {
          elasticsearch_url: elasticsearchUrl,
        };
        return response.ok({
          body,
        });
      }
    );
}
