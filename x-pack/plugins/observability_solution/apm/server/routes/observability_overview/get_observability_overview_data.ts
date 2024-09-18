/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getServiceCount } from './get_service_count';
import { getTransactionsPerMinute } from './get_transactions_per_minute';

export interface ObservabilityOverviewResponse {
  serviceCount: number;
  transactionPerMinute: {
    value: number | undefined;
    timeseries: Array<{ x: number; y: number | null }>;
  };
}

export function getObservabilityOverviewData({
  apmEventClient,
  start,
  end,
  searchAggregatedTransactions,
  bucketSize,
  intervalString,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
  bucketSize: number;
  intervalString: string;
}): Promise<ObservabilityOverviewResponse> {
  return withApmSpan(
    'observability_overview',
    async (): Promise<{
      serviceCount: number;
      transactionPerMinute:
        | { value: undefined; timeseries: never[] }
        | {
            value: number;
            timeseries: Array<{ x: number; y: number | null }>;
          };
    }> => {
      const [serviceCount, transactionPerMinute] = await Promise.all([
        getServiceCount({
          apmEventClient,
          searchAggregatedTransactions,
          start,
          end,
        }),
        getTransactionsPerMinute({
          apmEventClient,
          bucketSize,
          searchAggregatedTransactions,
          start,
          end,
          intervalString,
        }),
      ]);
      return { serviceCount, transactionPerMinute };
    }
  );
}
