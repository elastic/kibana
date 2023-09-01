/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { decodeStackTraceResponse } from '../../../common/stack_traces';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';

export async function searchStackTraces({
  client,
  sampleSize,
  rangeFrom,
  rangeTo,
  kuery,
}: {
  client: ProfilingESClient;
  sampleSize: number;
  rangeFrom: number;
  rangeTo: number;
  kuery: string;
}) {
  const response = await client.profilingStacktraces({
    query: {
      bool: {
        filter: [
          ...kqlQuery(kuery),
          {
            range: {
              ['@timestamp']: {
                gte: String(rangeFrom),
                lt: String(rangeTo),
                format: 'epoch_second',
                boost: 1.0,
              },
            },
          },
        ],
      },
    },
    sampleSize,
  });

  return decodeStackTraceResponse(response);
}

function kqlQuery(kql?: string): estypes.QueryDslQueryContainer[] {
  if (!kql) {
    return [];
  }

  const ast = fromKueryExpression(kql);
  return [toElasticsearchQuery(ast)];
}
