/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../../../common/processor_event';
import { Setup } from '../../../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration/all_option';
import {
  getProcessorEventForAggregatedTransactions,
  getDocumentTypeFilterForAggregatedTransactions,
} from '../../../helpers/aggregated_transactions/get_use_aggregated_transaction';

export async function getAllEnvironments({
  serviceName,
  setup,
  useAggregatedTransactions,
}: {
  serviceName: string | undefined;
  setup: Setup;
  useAggregatedTransactions: boolean;
}) {
  const { apmEventClient } = setup;

  // omit filter for service.name if "All" option is selected
  const serviceNameFilter = serviceName
    ? [{ term: { [SERVICE_NAME]: serviceName } }]
    : [];

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
      query: {
        bool: {
          filter: [
            ...serviceNameFilter,
            ...getDocumentTypeFilterForAggregatedTransactions(
              useAggregatedTransactions
            ),
          ],
        },
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            size: 100,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);
  const environments =
    resp.aggregations?.environments.buckets.map(
      (bucket) => bucket.key as string
    ) || [];

  return [ALL_OPTION_VALUE, ...environments];
}
