/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MsearchMultisearchHeader,
  MsearchMultisearchBody,
} from '@elastic/elasticsearch/lib/api/types';
import { AllowedValuesInputs } from '../schemas/get_unallowed_field_values';

export const getMSearchRequestHeader = (indexName: string): MsearchMultisearchHeader => ({
  expand_wildcards: ['open'],
  index: indexName,
});

export const getMSearchRequestBody = ({
  indexFieldName,
  allowedValues,
  from,
  to,
}: {
  indexFieldName: string;
  allowedValues: AllowedValuesInputs;
  from: string;
  to: string;
}): MsearchMultisearchBody => ({
  aggregations: {
    unallowedValues: {
      terms: {
        field: indexFieldName,
        order: {
          _count: 'desc',
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not:
              allowedValues.length > 0
                ? [
                    {
                      bool: {
                        should: allowedValues.map(({ name: allowedValue }) => ({
                          match_phrase: {
                            [indexFieldName]: allowedValue,
                          },
                        })),
                        minimum_should_match: 1,
                      },
                    },
                  ]
                : [],
          },
        },
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
  runtime_mappings: {},
  size: 0,
});
