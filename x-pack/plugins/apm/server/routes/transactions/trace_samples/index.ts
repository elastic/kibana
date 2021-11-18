/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../lib/helpers/setup_request';
import { getTraceSamples } from './get_trace_samples';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function getTransactionTraceSamples({
  kuery,
  environment,
  serviceName,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  sampleRangeFrom,
  sampleRangeTo,
  setup,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  transactionId: string;
  traceId: string;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  setup: Setup;
  start: number;
  end: number;
}) {
  return withApmSpan('get_transaction_trace_samples', async () => {
    return await getTraceSamples({
      environment,
      kuery,
      serviceName,
      transactionName,
      transactionType,
      transactionId,
      traceId,
      sampleRangeFrom,
      sampleRangeTo,
      setup,
      start,
      end,
    });
  });
}
