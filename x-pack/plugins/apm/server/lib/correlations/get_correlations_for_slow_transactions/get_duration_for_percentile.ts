/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../../../typings/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export async function getDurationForPercentile({
  durationPercentile,
  backgroundFilters,
  setup,
}: {
  durationPercentile: number;
  backgroundFilters: ESFilter[];
  setup: Setup & SetupTimeRange;
}) {
  const { apmEventClient } = setup;
  const res = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 0,
      query: {
        bool: { filter: backgroundFilters },
      },
      aggs: {
        percentile: {
          percentiles: {
            field: TRANSACTION_DURATION,
            percents: [durationPercentile],
          },
        },
      },
    },
  });

  return Object.values(res.aggregations?.percentile.values || {})[0];
}
