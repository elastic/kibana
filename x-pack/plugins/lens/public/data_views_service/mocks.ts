/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { documentField } from '../datasources/form_based/document_field';
import {
  createMockedIndexPattern,
  createMockedRestrictedIndexPattern,
} from '../datasources/form_based/mocks';
import { DataViewsState } from '../state_management';
import { IndexPattern } from '../types';
import { getFieldByNameFactory } from './loader';

/**
 * Create a DataViewState from partial parameters, and infer the rest from the passed one.
 * Passing no parameter will return an empty state.
 */
export const createMockDataViewsState = ({
  indexPatterns,
  indexPatternRefs,
}: Partial<DataViewsState> = {}): DataViewsState => {
  const refs =
    indexPatternRefs ??
    Object.values(indexPatterns ?? {}).map(({ id, title, name }) => ({ id, title, name }));
  return {
    indexPatterns: indexPatterns ?? {},
    indexPatternRefs: refs,
  };
};

export const createMockStorage = (lastData?: Record<string, string>) => {
  return {
    get: jest.fn().mockImplementation(() => lastData),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  };
};

const indexPattern1 = {
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  isPersisted: () => true,
  toSpec: () => ({}),
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
    {
      name: 'geo.src',
      displayName: 'geo.src',
      type: 'string',
      aggregatable: true,
      searchable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'scripted',
      displayName: 'Scripted',
      type: 'string',
      searchable: true,
      aggregatable: true,
      scripted: true,
      lang: 'painless',
      script: '1234',
    },
    documentField,
  ],
} as unknown as IndexPattern;
indexPattern1.getFieldByName = getFieldByNameFactory(indexPattern1.fields);

const sampleIndexPatternsFromService = {
  '1': createMockedIndexPattern(),
  '2': createMockedRestrictedIndexPattern(),
};

const indexPattern2 = {
  id: '2',
  title: 'my-fake-restricted-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: true,
  isPersisted: () => true,
  toSpec: () => ({}),
  fieldFormatMap: { bytes: { id: 'bytes', params: { pattern: '0.0' } } },
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
      aggregatable: true,
      searchable: true,
      aggregationRestrictions: {
        date_histogram: {
          agg: 'date_histogram',
          fixed_interval: '1d',
          delay: '7d',
          time_zone: 'UTC',
        },
      },
    },
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
      aggregationRestrictions: {
        // Ignored in the UI
        histogram: {
          agg: 'histogram',
          interval: 1000,
        },
        average: {
          agg: 'avg',
        },
        max: {
          agg: 'max',
        },
        min: {
          agg: 'min',
        },
        sum: {
          agg: 'sum',
        },
      },
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: true,
      searchable: true,
      scripted: true,
      lang: 'painless',
      script: '1234',
      aggregationRestrictions: {
        terms: {
          agg: 'terms',
        },
      },
    },
    documentField,
  ],
} as unknown as IndexPattern;
indexPattern2.getFieldByName = getFieldByNameFactory(indexPattern2.fields);

export const sampleIndexPatterns = {
  '1': indexPattern1,
  '2': indexPattern2,
};

export function mockDataViewsService() {
  return {
    get: jest.fn(async (id: '1' | '2') => {
      const result = {
        ...sampleIndexPatternsFromService[id],
        metaFields: [],
        isPersisted: () => true,
        toSpec: () => ({}),
      };
      if (!result.fields) {
        result.fields = [];
      }
      return result;
    }),
    getIdsWithTitle: jest.fn(async () => {
      return [
        {
          id: sampleIndexPatterns[1].id,
          title: sampleIndexPatterns[1].title,
        },
        {
          id: sampleIndexPatterns[2].id,
          title: sampleIndexPatterns[2].title,
        },
      ];
    }),
    create: jest.fn(),
  } as unknown as Pick<DataViewsContract, 'get' | 'getIdsWithTitle' | 'create'>;
}
