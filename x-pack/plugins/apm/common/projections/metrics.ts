/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  PROCESSOR_EVENT,
  SERVICE_NODE_NAME,
} from '../elasticsearch_fieldnames';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { rangeFilter } from '../utils/range_filter';
import { SERVICE_NODE_NAME_MISSING } from '../service_nodes';

function getServiceNodeNameFilters(serviceNodeName?: string) {
  if (!serviceNodeName) {
    return [];
  }

  if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
    return [{ bool: { must_not: [{ exists: { field: SERVICE_NODE_NAME } }] } }];
  }

  return [{ term: { [SERVICE_NODE_NAME]: serviceNodeName } }];
}

export function getMetricsProjection({
  setup,
  serviceName,
  serviceNodeName,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  serviceNodeName?: string;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    { range: rangeFilter(start, end) },
    ...getServiceNodeNameFilters(serviceNodeName),
    ...uiFiltersES,
  ];

  return {
    index: indices['apm_oss.metricsIndices'],
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  };
}
