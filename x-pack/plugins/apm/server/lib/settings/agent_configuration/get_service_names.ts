/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../helpers/setup_request';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../common/agent_configuration/all_option';
import { getProcessorEventForAggregatedTransactions } from '../../helpers/aggregated_transactions';

export type AgentConfigurationServicesAPIResponse = PromiseReturnType<
  typeof getServiceNames
>;
export async function getServiceNames({
  setup,
  searchAggregatedTransactions,
}: {
  setup: Setup;
  searchAggregatedTransactions: boolean;
}) {
  const { apmEventClient, config } = setup;
  const maxServiceSelection = config['xpack.apm.maxServiceSelection'];

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      timeout: '1ms',
      size: 0,
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: maxServiceSelection,
            min_doc_count: 0,
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
