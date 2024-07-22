/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { CatIndicesResponse } from '@elastic/elasticsearch/lib/api/types';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getIndexSizesRoute: SyntheticsRestApiRouteFactory<{
  data: CatIndicesResponse;
}> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.INDEX_SIZE,
  validate: {
    query: schema.object({
      use_metering: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ syntheticsEsClient, server, request }) => {
    const scopedClusterClient = server.coreStart.elasticsearch.client.asScoped(request);
    const { use_metering: useMetering } = request.query;
    let data: CatIndicesResponse;
    if (useMetering) {
      data = await scopedClusterClient.asInternalUser.transport.request(
        {
          method: 'GET',
          path: `/_metering/stats/synthetics-*`,
        },
        { headers: { 'es-secondary-authorization': request.headers.authorization } }
      );
    } else {
      data = await syntheticsEsClient.baseESClient.cat.indices({
        index: 'synthetics-*',
        format: 'json',
        bytes: 'b',
      });
    }

    return { data };
  },
});
