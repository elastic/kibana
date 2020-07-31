/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupUIFilters,
  SetupTimeRange,
} from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME } from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { ProcessorEvent } from '../../common/processor_event';

export function getServicesProjection({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES } = setup;

  return {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [{ range: rangeFilter(start, end) }, ...uiFiltersES],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
          },
        },
      },
    },
  };
}
