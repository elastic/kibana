/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { createTopNFunctions } from '../../common/functions';
import { createProfilingEsClient, ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { getExecutablesAndStackTraces } from './get_executables_and_stacktraces';
import { createCommonFilter, ProjectTimeQuery } from './query';

async function queryTopNFunctions({
  logger,
  client,
  filter,
  startIndex,
  endIndex,
  sampleSize,
}: {
  logger: Logger;
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  startIndex: number;
  endIndex: number;
  sampleSize: number;
}) {
  return withProfilingSpan('query_topn_functions', async () => {
    return getExecutablesAndStackTraces({
      client,
      filter,
      logger,
      sampleSize,
    }).then(({ stackFrames, stackTraceEvents, stackTraces, executables }) => {
      return createTopNFunctions(
        stackTraceEvents,
        stackTraces,
        stackFrames,
        executables,
        startIndex,
        endIndex
      );
    });
  });
}

const querySchema = schema.object({
  timeFrom: schema.string(),
  timeTo: schema.string(),
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

        const topNFunctions = await queryTopNFunctions({
          logger,
          client: createProfilingEsClient({ request, esClient }),
          filter,
          startIndex,
          endIndex,
          sampleSize: targetSampleSize,
        });
        logger.info('returning payload response to client');

        return response.ok({
          body: topNFunctions,
        });
      } catch (e) {
        logger.error(e);
        return response.customError({
          statusCode: e.statusCode ?? 500,
          body: {
            message: e.message,
          },
        });
      }
    }
  );
}
