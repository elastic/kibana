/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { ICustomClusterClient, IRouter } from 'src/core/server';
import { INDEX_NAMES } from '../../../common/constants';
import { licenseCheckerRouteHandlerWrapper } from '../../../../licensing/server';

import { checkLicense } from '../../lib/check_license';

export function registerPipelineDeleteRoute(router: IRouter, esClient: ICustomClusterClient) {
  router.delete(
    {
      path: '/api/logstash/pipeline/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licenseCheckerRouteHandlerWrapper(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        const client = esClient.asScoped(request);

        await client.callAsCurrentUser('delete', {
          index: INDEX_NAMES.PIPELINES,
          id: request.params.id,
          refresh: 'wait_for',
        });

        return response.noContent();
      })
    )
  );
}
