/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractDocumentation } from './schema_extractor';
import * as path from 'path';

describe('schema_extractor', () => {
  it('should serialize schema definition', () => {
    const result = extractDocumentation([
      path.resolve(__dirname, '..', 'schemas', 'datafeeds_schema.ts'),
    ]);

    expect(result.get('startDatafeedSchema')).toEqual([
      {
        name: 'start',
        documentation: '',
        type: 'string | number',
      },
      {
        name: 'end',
        documentation: '',
        type: 'string | number',
      },
      {
        name: 'timeout',
        documentation: '',
        type: 'any',
      },
    ]);

    expect(result.get('datafeedConfigSchema')).toEqual([
      {
        name: 'datafeed_id',
        documentation: '',
        type: 'string',
      },
      {
        name: 'feed_id',
        documentation: '',
        type: 'string',
      },
      {
        name: 'aggregations',
        documentation: '',
        type: 'any',
      },
      {
        name: 'aggs',
        documentation: '',
        type: 'any',
      },
      {
        name: 'chunking_config',
        documentation: '',
        type: 'chunking_config',
        nested: [
          {
            name: 'mode',
            documentation: '',
            type: 'string',
          },
          {
            name: 'time_span',
            documentation: '',
            type: 'string',
          },
        ],
      },
      {
        name: 'frequency',
        documentation: '',
        type: 'string',
      },
      {
        name: 'indices',
        documentation: '',
        type: 'string[]',
      },
      {
        name: 'indexes',
        documentation: '',
        type: 'string[]',
      },
      {
        name: 'job_id',
        documentation: '',
        type: 'string',
      },
      {
        name: 'query',
        documentation: '',
        type: 'any',
      },
      {
        name: 'max_empty_searches',
        documentation: '',
        type: 'number',
      },
      {
        name: 'query_delay',
        documentation: '',
        type: 'string',
      },
      {
        name: 'script_fields',
        documentation: '',
        type: 'any',
      },
      {
        name: 'scroll_size',
        documentation: '',
        type: 'number',
      },
      {
        name: 'delayed_data_check_config',
        documentation: '',
        type: 'any',
      },
      {
        name: 'indices_options',
        documentation: '',
        type: 'indices_options',
        nested: [
          {
            name: 'expand_wildcards',
            documentation: '',
            type: 'string[]',
          },
          {
            name: 'ignore_unavailable',
            documentation: '',
            type: 'boolean',
          },
          {
            name: 'allow_no_indices',
            documentation: '',
            type: 'boolean',
          },
          {
            name: 'ignore_throttled',
            documentation: '',
            type: 'boolean',
          },
        ],
      },
    ]);

    expect(result.get('deleteDatafeedQuerySchema')).toEqual([
      {
        name: 'force',
        documentation: '',
        type: 'any', // string
      },
    ]);
  });

  it('serializes schema with nested objects and nullable', () => {
    const result = extractDocumentation([
      path.resolve(__dirname, '..', 'schemas', 'results_service_schema.ts'),
    ]);
    expect(result.get('getCategorizerStatsSchema')).toEqual([
      {
        name: 'partitionByValue',
        documentation:
          'Optional value to fetch the categorizer stats where results are filtered by partition_by_value = value',
        type: 'any', // FIXME string
      },
    ]);

    // @ts-ignore
    expect(result.get('partitionFieldValuesSchema')![5].nested[0]).toEqual({
      name: 'partition_field',
      documentation: '',
      type: 'partition_field',
      nested: [
        {
          name: 'applyTimeRange',
          documentation: '',
          type: 'boolean',
        },
        {
          name: 'anomalousOnly',
          documentation: '',
          type: 'boolean',
        },
        {
          name: 'sort',
          documentation: '',
          type: 'sort',
          nested: [
            {
              name: 'by',
              documentation: '',
              type: 'string',
            },
            {
              name: 'order',
              documentation: '',
              type: 'string',
            },
          ],
        },
      ],
    });
  });
});
