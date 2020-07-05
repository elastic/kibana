/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../helpers/setup_request';
import { getHasAggregatedTransactions } from '../helpers/aggregated_transactions/get_use_aggregated_transaction';

export async function hasData({ setup }: { setup: Setup }) {
  const { apmEventClient, config } = setup;
  try {
    const getHasTransactionDocuments = async () => {
      const response = await apmEventClient.search({
        apm: {
          events: [ProcessorEvent.transaction],
        },
        terminateAfter: 1,
      });

      return response.hits.total.value > 0;
    };

    const [hasMetricDocuments, hasTransactionDocuments] = await Promise.all([
      config['xpack.apm.useAggregatedTransactions']
        ? getHasAggregatedTransactions({ apmEventClient })
        : undefined,
      getHasTransactionDocuments(),
    ]);

    return hasMetricDocuments || hasTransactionDocuments;
  } catch (e) {
    return false;
  }
}
