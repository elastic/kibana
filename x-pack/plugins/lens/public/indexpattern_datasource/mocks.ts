/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DragContextState } from '../drag_drop';
import { IndexPattern } from './types';

export const createMockedIndexPattern = (): IndexPattern => ({
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'start_date',
      displayName: 'start_date',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'memory',
      displayName: 'memory',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: true,
      searchable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'unsupported',
      displayName: 'unsupported',
      type: 'geo',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'dest',
      displayName: 'dest',
      type: 'string',
      aggregatable: true,
      searchable: true,
      esTypes: ['keyword'],
    },
  ],
});

export const createMockedRestrictedIndexPattern = () => ({
  id: '2',
  title: 'my-fake-restricted-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: true,
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: true,
      searchable: true,
      scripted: true,
      esTypes: ['keyword'],
    },
  ],
  typeMeta: {
    params: {
      rollup_index: 'my-fake-index-pattern',
    },
    aggs: {
      terms: {
        source: {
          agg: 'terms',
        },
      },
      date_histogram: {
        timestamp: {
          agg: 'date_histogram',
          fixed_interval: '1d',
          delay: '7d',
          time_zone: 'UTC',
        },
      },
      histogram: {
        bytes: {
          agg: 'histogram',
          interval: 1000,
        },
      },
      avg: {
        bytes: {
          agg: 'avg',
        },
      },
      max: {
        bytes: {
          agg: 'max',
        },
      },
      min: {
        bytes: {
          agg: 'min',
        },
      },
      sum: {
        bytes: {
          agg: 'sum',
        },
      },
    },
  },
});

export function createMockedDragDropContext(): jest.Mocked<DragContextState> {
  return {
    dragging: undefined,
    setDragging: jest.fn(),
  };
}
