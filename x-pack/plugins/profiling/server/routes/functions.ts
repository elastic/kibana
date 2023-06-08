/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { createTopNFunctions } from '../../common/functions';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { createCommonFilter } from './query';
import { searchStackTraces } from './search_stacktraces';

const querySchema = schema.object({
  timeFrom: schema.number(),
  timeTo: schema.number(),
  startIndex: schema.number(),
  endIndex: schema.number(),
  kuery: schema.string(),
});

type QuerySchemaType = TypeOf<typeof querySchema>;

export function registerTopNFunctionsSearchRoute({
  router,
  logger,
  services: { createProfilingEsClient },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.TopNFunctions,
      validate: {
        query: querySchema,
      },
    },
    async (context, request, response) => {
      try {
        const { timeFrom, timeTo, startIndex, endIndex, kuery }: QuerySchemaType = request.query;

        const targetSampleSize = 20000; // minimum number of samples to get statistically sound results
        const esClient = await getClient(context);
        const profilingElasticsearchClient = createProfilingEsClient({ request, esClient });
        const filter = createCommonFilter({
          timeFrom,
          timeTo,
          kuery,
        });

        const t0 = Date.now();
        const { stackTraceEvents, stackTraces, executables, stackFrames } = await searchStackTraces(
          {
            client: profilingElasticsearchClient,
            filter,
            sampleSize: targetSampleSize,
          }
        );
        logger.info(`querying stacktraces took ${Date.now() - t0} ms`);

        const t1 = Date.now();
        const topNFunctions = await withProfilingSpan('create_topn_functions', async () => {
          return createTopNFunctions(
            stackTraceEvents,
            stackTraces,
            stackFrames,
            executables,
            startIndex,
            endIndex
          );
        });
        logger.info(`creating topN functions took ${Date.now() - t1} ms`);

        logger.info('returning payload response to client');

        return response.ok({
          body: topNFunctions,
        });
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
}
