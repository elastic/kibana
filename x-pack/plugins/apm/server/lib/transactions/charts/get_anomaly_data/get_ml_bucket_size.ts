/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

interface IOptions {
  setup: Setup & SetupTimeRange;
  jobId: string;
  logger: Logger;
}

interface ESResponse {
  bucket_span: number;
}

export async function getMlBucketSize({
  setup,
  jobId,
  logger,
}: IOptions): Promise<number | undefined> {
  const { ml, start, end } = setup;
  if (!ml) {
    return;
  }

  const params = {
    body: {
      _source: 'bucket_span',
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            { term: { job_id: jobId } },
            { exists: { field: 'bucket_span' } },
            {
              range: {
                timestamp: { gte: start, lte: end, format: 'epoch_millis' },
              },
            },
          ],
        },
      },
    },
  };

  try {
    const resp = await ml.mlSystem.mlAnomalySearch<ESResponse>(params);
    return resp.hits.hits[0]?._source.bucket_span;
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      return;
    }
    logger.error(err);
  }
}
