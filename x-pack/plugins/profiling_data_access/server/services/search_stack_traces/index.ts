/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeStackTraceResponse } from '@kbn/profiling-utils';
import { ProfilingESClient } from '../../../common/profiling_es_client';
import { kqlQuery } from '../../utils/query';

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
