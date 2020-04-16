/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { INDEX_NAMES } from '../../../common/constants';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';

import { checkLicense } from '../../lib/check_license';

export function registerPipelineDeleteRoute(router: IRouter) {
  router.delete(
    {
      path: '/api/logstash/pipeline/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        const client = context.logstash!.esClient;

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
