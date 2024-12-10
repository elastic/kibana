/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';

interface Params {
  profilingDataAccessStart: ProfilingDataAccessPluginStart;
  core: CoreRequestHandlerContext;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  kuery: string;
  serviceName?: string;
  transactionName?: string;
  environment?: string;
  transactionType?: string;
  indices?: string[];
  stacktraceIdsField?: string;
}

export function fetchFlamegraph({
  profilingDataAccessStart,
  core,
  esClient,
  start,
  end,
  kuery,
  serviceName,
  transactionName,
  environment,
  transactionType,
  indices,
  stacktraceIdsField,
}: Params) {
  return profilingDataAccessStart.services.fetchFlamechartData({
    core,
    esClient,
    totalSeconds: end - start,
    indices,
    stacktraceIdsField,
    query: {
      bool: {
        filter: [
          ...kqlQuery(kuery),
          ...termQuery(SERVICE_NAME, serviceName),
          ...termQuery(TRANSACTION_NAME, transactionName),
          ...environmentQuery(environment),
          ...termQuery(TRANSACTION_TYPE, transactionType),
          {
            range: {
              ['@timestamp']: {
                gte: String(start),
                lt: String(end),
                format: 'epoch_second',
              },
            },
          },
        ],
      },
    },
  });
}
