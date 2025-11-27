/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorSampleDetails } from '../../errors/get_error_groups/get_error_sample_details';
import { getErrorGroupSampleIds } from '../../errors/get_error_groups/get_error_group_sample_ids';
import { getRootTransactionByTraceId } from '../../transactions/get_transaction_by_trace';
import { getTraceSummaryCount } from '../../traces/get_trace_summary_count';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export interface GetErrorContextDataParams {
  apmEventClient: APMEventClient;
  serviceName: string;
  errorId: string;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}

export async function getErrorContextData({
  apmEventClient,
  serviceName,
  errorId,
  start,
  end,
  environment,
  kuery,
}: GetErrorContextDataParams): Promise<{ errorData: any }> {
  const errorSample = await getErrorSampleDetails({
    apmEventClient,
    environment,
    kuery,
    serviceName,
    errorId,
    start,
    end,
  });

  const traceId = errorSample.error?.trace?.id;
  const transactionId = errorSample.error?.transaction?.id;
  const groupingKey = errorSample.error?.error?.grouping_key;

  let errorGroup = { total: 0, sampleIds: [] as string[] };
  if (groupingKey) {
    const { errorSampleIds, occurrencesCount } = await getErrorGroupSampleIds({
      apmEventClient,
      environment,
      kuery,
      serviceName,
      groupId: groupingKey,
      start,
      end,
    });
    errorGroup = {
      total: occurrencesCount,
      sampleIds: errorSampleIds.slice(0, 10),
    };
  }

  let rootTransaction: any;
  let summary: { services: number; traceEvents: number } | undefined;
  if (traceId) {
    const root = await getRootTransactionByTraceId({
      apmEventClient,
      traceId,
      start,
      end,
    });
    rootTransaction = root.transaction;

    const counts = await getTraceSummaryCount({
      apmEventClient,
      traceId,
      start,
      end,
    });
    summary = counts;
  }

  const context = {
    error: errorSample.error,
    transaction: errorSample.transaction,
    transactionId,
    traceId,
    errorGroup,
    trace: traceId
      ? {
          rootTransaction,
          summary,
        }
      : undefined,
  };

  return { errorData: context };
}
