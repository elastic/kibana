/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { callWorkplaceSearchGateAPI } from '../../lib/workplace_search_gated_form_api';
import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerGatedFormRoute({ router, config, log }: RouteDependencies) {
  console.log('###registerGatedFormRoute');
  router.post(
    {
      path: '/internal/workplace_search/ws_gate',
      validate: {
        body: schema.object({
          ws_gate_data: schema.object({
            feature: schema.string(),
            features_other: schema.maybe(schema.string()),
            additional_feedback: schema.maybe(schema.string()),
            participate_in_ux_labs: schema.maybe(schema.boolean()),
          }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      console.log('GATED elasticsearchErrorHandler');
      const data = await callWorkplaceSearchGateAPI({ config, log, request });
      console.log('data', data);
      if ('responseStatus' === data) {
        return response.customError({
          body: 'Error fetching data from Enterprise Search',
          statusCode: 400,
        });
      } else if (!Object.keys(data).length) {
        return response.customError({
          body: 'Error fetching data from Enterprise Search',
          statusCode: 502,
        });
      } else {
        return response.ok({
          body: data,
          headers: { 'content-type': 'application/json' },
        });
      }
    })
  );
}

// export const warnMismatchedVersions = (enterpriseSearchVersion: string, log: Logger) => {
//   const kibanaVersion = kibanaPackageJson.version;

//   if (isVersionMismatch(enterpriseSearchVersion, kibanaVersion)) {
//     log.warn(
//       `Your Kibana instance (v${kibanaVersion}) is not the same version as your Enterprise Search instance (v${enterpriseSearchVersion}), which may cause unexpected behavior. Use matching versions for the best experience.`
//     );
//   }
// };
