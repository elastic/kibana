/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../../../typings/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { TopSigTerm } from '../process_significant_term_aggs';

export async function getMaxLatency({
  setup,
  filters,
  topSigTerms = [],
}: {
  setup: Setup & SetupTimeRange;
  filters: ESFilter[];
  topSigTerms?: TopSigTerm[];
}) {
  const { apmEventClient } = setup;

  const params = {
    // TODO: add support for metrics
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: {
        bool: {
          filter: filters,

          ...(topSigTerms.length
            ? {
                // only include docs containing the significant terms
                should: topSigTerms.map((term) => ({
                  term: { [term.fieldName]: term.fieldValue },
                })),
                minimum_should_match: 1,
              }
            : null),
        },
      },
      aggs: {
        // TODO: add support for metrics
        // max_latency: { max: { field: TRANSACTION_DURATION } },
        max_latency: {
          percentiles: { field: TRANSACTION_DURATION, percents: [99] },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_max_latency', params);
  // return response.aggregations?.max_latency.value;
  return Object.values(response.aggregations?.max_latency.values ?? {})[0];
}
