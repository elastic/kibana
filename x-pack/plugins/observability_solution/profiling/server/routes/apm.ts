/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { termQuery } from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import { IDLE_SOCKET_TIMEOUT, RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getClient } from './compat';

const querySchema = schema.object({
  timeFrom: schema.number(),
  timeTo: schema.number(),
  functionName: schema.string(),
  serviceNames: schema.arrayOf(schema.string()),
});

type QuerySchemaType = TypeOf<typeof querySchema>;

export function registerTopNFunctionsAPMTransactionsRoute({
  router,
  logger,
  dependencies: {
    start: { profilingDataAccess },
    setup: { apmDataAccess },
  },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.APMTransactions,
      security: {
        authz: {
          requiredPrivileges: ['profiling', 'apm'],
        },
      },
      options: {
        timeout: { idleSocket: IDLE_SOCKET_TIMEOUT },
      },
      validate: { query: querySchema },
    },
    async (context, request, response) => {
      try {
        if (!apmDataAccess) {
          return response.ok({
            body: [],
          });
        }
        const core = await context.core;
        const { transaction: transactionIndices } = await apmDataAccess.getApmIndices(
          core.savedObjects.client
        );

        const esClient = await getClient(context);

        const { timeFrom, timeTo, functionName, serviceNames }: QuerySchemaType = request.query;
        const startSecs = timeFrom / 1000;
        const endSecs = timeTo / 1000;

        const transactionsPerService = await Promise.all(
          serviceNames.slice(0, 5).map(async (serviceName) => {
            const apmFunctions = await profilingDataAccess.services.fetchESFunctions({
              core,
              esClient,
              query: {
                bool: {
                  filter: [
                    ...termQuery('service.name', serviceName),
                    {
                      range: {
                        ['@timestamp']: {
                          gte: String(startSecs),
                          lt: String(endSecs),
                          format: 'epoch_second',
                        },
                      },
                    },
                  ],
                },
              },
              aggregationField: 'transaction.name',
              indices: transactionIndices.split(','),
              stacktraceIdsField: 'transaction.profiler_stack_trace_ids',
              limit: 1000,
              totalSeconds: endSecs - startSecs,
            });
            const apmFunction = apmFunctions.TopN.find(
              (topNFunction) => topNFunction.Frame.FunctionName === functionName
            );

            if (apmFunction?.subGroups) {
              const subGroups = apmFunction.subGroups;
              return {
                serviceName,
                transactions: Object.keys(subGroups).map((key) => ({
                  name: key,
                  samples: subGroups[key],
                })),
              };
            }
          })
        );

        const transactionsGroupedByService = keyBy(transactionsPerService, 'serviceName');

        return response.ok({
          body: transactionsGroupedByService,
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
