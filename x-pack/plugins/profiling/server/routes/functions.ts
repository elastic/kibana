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
      options: { tags: ['access:profiling'] },
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

        const { events, stackTraces, executables, stackFrames, samplingRate } =
          await searchStackTraces({
            client: profilingElasticsearchClient,
            filter,
            sampleSize: targetSampleSize,
          });

        const topNFunctions = await withProfilingSpan('create_topn_functions', async () => {
          return createTopNFunctions({
            endIndex,
            events,
            executables,
            samplingRate,
            stackFrames,
            stackTraces,
            startIndex,
          });
        });

        return response.ok({
          body: topNFunctions,
        });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching TopN functions',
        });
      }
    }
  );
}
