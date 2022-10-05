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
import { createProfilingEsClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { getExecutablesAndStackTraces } from './get_executables_and_stacktraces';
import { createCommonFilter } from './query';

const querySchema = schema.object({
  timeFrom: schema.number(),
  timeTo: schema.number(),
  startIndex: schema.number(),
  endIndex: schema.number(),
  kuery: schema.string(),
});

type QuerySchemaType = TypeOf<typeof querySchema>;

export function registerTopNFunctionsSearchRoute({ router, logger }: RouteRegisterParameters) {
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
        const filter = createCommonFilter({
          timeFrom,
          timeTo,
          kuery,
        });

        const { stackFrames, stackTraceEvents, stackTraces, executables } =
          await getExecutablesAndStackTraces({
            client: createProfilingEsClient({ request, esClient }),
            filter,
            logger,
            sampleSize: targetSampleSize,
          });

        const t0 = Date.now();
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
        logger.info(`creating topN functions took ${Date.now() - t0} ms`);

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
