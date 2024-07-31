/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import { METRICSET_NAME, METRICSET_INTERVAL } from '@kbn/apm-types/es_fields';

export function getDocumentTypeFilterForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? [
        {
          bool: {
            filter: termQuery(METRICSET_NAME, 'service_destination'),
            must_not: {
              terms: {
                [METRICSET_INTERVAL]: ['10m', '60m'],
              },
            },
          },
        },
      ]
    : [];
}
