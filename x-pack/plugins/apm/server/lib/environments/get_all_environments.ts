/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { withApmSpan } from '../../utils/with_apm_span';

/**
 * This is used for getting *all* environments, and does not filter by range.
 * It's used in places where we get the list of all possible environments.
 */
export async function getAllEnvironments({
  serviceName,
  setup,
  searchAggregatedTransactions,
  includeMissing = false,
}: {
  serviceName?: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  includeMissing?: boolean;
}) {
  const spanName = serviceName
    ? 'get_all_environments_for_service'
    : 'get_all_environments_for_all_services';
  return withApmSpan(spanName, async () => {
    const { apmEventClient, config } = setup;
    const maxServiceEnvironments = config['xpack.apm.maxServiceEnvironments'];

    // omit filter for service.name if "All" option is selected
    const serviceNameFilter = serviceName
      ? [{ term: { [SERVICE_NAME]: serviceName } }]
      : [];

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
        // use timeout + min_doc_count to return as early as possible
        // if filter is not defined to prevent timeouts
        ...(!serviceName ? { timeout: '1ms' } : {}),
        size: 0,
        query: {
          bool: {
            filter: [...serviceNameFilter],
          },
        },
        aggs: {
          environments: {
            terms: {
              field: SERVICE_ENVIRONMENT,
              size: maxServiceEnvironments,
              ...(!serviceName ? { min_doc_count: 0 } : {}),
              missing: includeMissing
                ? ENVIRONMENT_NOT_DEFINED.value
                : undefined,
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
    return environments;
  });
}
