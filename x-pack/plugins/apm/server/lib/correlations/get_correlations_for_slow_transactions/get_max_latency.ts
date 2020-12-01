/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../../../typings/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { TopSigTerm } from './format_top_significant_terms';

export async function getMaxLatency({
  setup,
  backgroundFilters,
  topSigTerms,
}: {
  setup: Setup & SetupTimeRange;
  backgroundFilters: ESFilter[];
  topSigTerms: TopSigTerm[];
}) {
  const { apmEventClient } = setup;

  const params = {
    // TODO: add support for metrics
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: {
        bool: {
          filter: backgroundFilters,

          // only include docs containing the significant terms
          should: topSigTerms.map((term) => ({
            term: { [term.fieldName]: term.fieldValue },
          })),
          minimum_should_match: 1,
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

  const response = await apmEventClient.search(params);
  // return response.aggregations?.max_latency.value;
  return Object.values(response.aggregations?.max_latency.values ?? {})[0];
}
