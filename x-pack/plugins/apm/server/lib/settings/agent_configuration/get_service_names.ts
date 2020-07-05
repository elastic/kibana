/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../helpers/setup_request';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../common/agent_configuration/all_option';
import { getProcessorEventForAggregatedTransactions } from '../../helpers/aggregated_transactions/get_use_aggregated_transaction';

export type AgentConfigurationServicesAPIResponse = PromiseReturnType<
  typeof getServiceNames
>;
export async function getServiceNames({
  setup,
  useAggregatedTransactions,
}: {
  setup: Setup;
  useAggregatedTransactions: boolean;
}) {
  const { apmEventClient } = setup;

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      size: 0,
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 50,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);
  const serviceNames =
    resp.aggregations?.services.buckets
      .map((bucket) => bucket.key as string)
      .sort() || [];
  return [ALL_OPTION_VALUE, ...serviceNames];
}
