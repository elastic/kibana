/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  ERROR_GROUP_ID,
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { ProcessorEvent } from '../../common/processor_event';

export function getErrorGroupsProjection({
  setup,
  serviceName,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
}) {
  const { start, end, uiFiltersES } = setup;

  return {
    apm: {
      events: [ProcessorEvent.error as const],
    },
    body: {
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES,
          ],
        },
      },
      aggs: {
        error_groups: {
          terms: {
            field: ERROR_GROUP_ID,
          },
        },
      },
    },
  };
}
