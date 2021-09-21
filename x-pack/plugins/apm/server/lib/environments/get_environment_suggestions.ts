/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { Setup } from '../helpers/setup_request';

export async function getEnvironmentSuggestions({
  searchAggregatedTransactions,
  setup,
  string,
}: {
  searchAggregatedTransactions: boolean;
  setup: Setup;
  string: string;
}) {
  const { apmEventClient, config } = setup;
  const maxSuggestions = config['xpack.apm.maxServiceEnvironments']; // FIXME: Rename this

  const response = await apmEventClient.termsEnum(
    'get_environment_suggestions',
    {
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
        case_insensitive: true,
        field: SERVICE_ENVIRONMENT,
        size: maxSuggestions,
        string,
      },
    }
  );

  return { environments: response.terms };
}
