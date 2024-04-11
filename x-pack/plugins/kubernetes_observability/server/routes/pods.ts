/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter, Logger } from '@kbn/core/server';
import {
    POD_STATUS_ROUTE,
} from '../../common/constants';

export const registerPodsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_STATUS_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              pod_name: schema.string(),
              namespace: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        return response.ok({
          body: {
            time: new Date().toISOString(),
            message: "Pod default/redis is in Running state",
            state: "Running",
            name: "redis",
            namespace: "default",
            node: "node1",
          },
        });
      }
    );
};

// export const doCount = async (
//   client: ElasticsearchClient,
//   index: string,
//   query: string,
//   field: string
// ) => {
//   const queryDSL = JSON.parse(query);

//   const search = await client.search({
//     index: [index],
//     body: {
//       query: queryDSL,
//       size: 0,
//       aggs: {
//         custom_count: {
//           cardinality: {
//             field,
//           },
//         },
//       },
//     },
//   });

//   const agg: any = search.aggregations?.custom_count;

//   return agg?.value || 0;
// };
