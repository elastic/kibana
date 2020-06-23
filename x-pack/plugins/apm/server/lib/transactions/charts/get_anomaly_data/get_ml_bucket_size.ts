/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMlJobId } from '../../../../../common/ml_job_constants';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

interface IOptions {
  serviceName: string;
  transactionType: string;
  setup: Setup & SetupTimeRange;
}

interface ESResponse {
  bucket_span: number;
}

export async function getMlBucketSize({
  serviceName,
  transactionType,
  setup,
}: IOptions): Promise<number> {
  const { ml, start, end } = setup;
  if (!ml) {
    return 0;
  }
  const jobId = getMlJobId(serviceName, transactionType);

  const params = {
    body: {
      _source: 'bucket_span',
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { job_id: jobId } },
            { exists: { field: 'bucket_span' } },
            {
              range: {
                timestamp: {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    },
  };

  try {
    const resp = await ml.mlSystem.mlAnomalySearch<ESResponse>(params);
    return resp.hits.hits[0]?._source.bucket_span || 0;
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      return 0;
    }
    throw err;
  }
}
