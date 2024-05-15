/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { defineQueryForAllPodsMemoryUtilisation, calulcatePodsMemoryUtilisation } from '../lib/pods_memory_utils';

import { extractFieldValue, checkDefaultNamespace } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_MEMORY_ROUTE,
} from '../../common/constants';


export const registerPodsMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_MEMORY_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              name: schema.maybe(schema.string()),
              namespace: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);

        if (request.query.name !== undefined) {
          const client = (await context.core).elasticsearch.client.asCurrentUser;
          //const dsl = defineQueryForPodsMemoryUtilisation(request.query.name, namespace, client)
          //const esResponse = await client.search(dsl);
          const dslAll = defineQueryForAllPodsMemoryUtilisation(request.query.name, namespace, client)
          const esResponseAll = await client.search(dslAll);
          // console.log(dslAll);
          // console.log(esResponseAll.hits.hits);
          // console.log(esResponseAll.hits.hits.length);
          //console.log(esResponse);

          if (esResponseAll.hits.hits.length > 0) {
            const hits = esResponseAll.hits.hits[0];
            const { fields = {} } = hits;
            const time = extractFieldValue(fields['@timestamp']);

            const [reason, pod] = calulcatePodsMemoryUtilisation(request.query.name, namespace, esResponseAll)
            return response.ok({
              body: {
                time: time,
                pod,
                reason: reason.reason,
              },
            });
          } else {
            const message = `Pod ${namespace}/${request.query.name} not found`
            return response.ok({
              body: {
                time: '',
                message: message,
                name: request.query.name,
                namespace: namespace,
                reason: "Not found",
              },
            });
          }
        }
      }
    );
};
