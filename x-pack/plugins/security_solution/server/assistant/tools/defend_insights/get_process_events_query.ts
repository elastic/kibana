/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import { processEventsIndexPattern } from '../../../../common/endpoint/constants';

const SIZE = 100;

export const getProcessEventsQuery = ({
  endpointIds,
  anonymizationFields,
}: {
  endpointIds: string[];
  anonymizationFields: AnonymizationFieldResponse[];
}) => ({
  allow_no_indices: true,
  body: {
    fields: anonymizationFields
      .filter((fieldItem) => fieldItem.allowed)
      .map((fieldItem) => ({
        field: fieldItem.field,
        include_unmapped: true,
      })),
    query: {
      bool: {
        must: [
          {
            terms: {
              'agent.id': endpointIds,
            },
          },
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
                lte: 'now',
              },
            },
          },
        ],
      },
    },
    size: SIZE,
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: ['agent.id', 'process.executable'],
  },
  ignore_unavailable: true,
  index: [processEventsIndexPattern],
});
