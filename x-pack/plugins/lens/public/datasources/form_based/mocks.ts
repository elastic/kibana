/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldByNameFactory } from './pure_helpers';
import type { IndexPattern, IndexPatternField } from '../../types';

export function createMockedField(
  someProps: Partial<IndexPatternField> & Pick<IndexPatternField, 'name' | 'type'>
) {
  return {
    displayName: someProps.name,
    aggregatable: true,
    searchable: true,
    ...someProps,
  };
}

export const createMockedIndexPattern = (
  someProps?: Partial<IndexPattern>,
  customFields: IndexPatternField[] = []
): IndexPattern => {
  const fields = [
    createMockedField({
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
    }),
    createMockedField({
      name: 'start_date',
      type: 'date',
    }),
    createMockedField({
      name: 'bytes',
      type: 'number',
    }),
    createMockedField({
      name: 'memory',
      type: 'number',
      esTypes: ['float'],
    }),
    createMockedField({
      name: 'source',
      type: 'string',
      esTypes: ['keyword'],
    }),
    createMockedField({
      name: 'unsupported',
      type: 'geo',
    }),
    createMockedField({
      name: 'dest',
      type: 'string',
      esTypes: ['keyword'],
    }),
    createMockedField({
      name: 'geo.src',
      type: 'string',
      esTypes: ['keyword'],
    }),
    createMockedField({
      name: 'scripted',
      displayName: 'Scripted',
      type: 'string',
      scripted: true,
      lang: 'painless' as const,
      script: '1234',
    }),
    createMockedField({
      name: 'runtime-keyword',
      displayName: 'Runtime keyword field',
      type: 'string',
      runtime: true,
      lang: 'painless' as const,
      script: 'emit("123")',
    }),
    createMockedField({
      name: 'runtime-number',
      displayName: 'Runtime number field',
      type: 'number',
      runtime: true,
      lang: 'painless' as const,
      script: 'emit(123)',
    }),
    ...(customFields || []),
  ];
  return {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasRestrictions: false,
    fields,
    getFieldByName: getFieldByNameFactory(fields),
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
    isPersisted: true,
    spec: {},
    ...someProps,
  };
};

export const createMockedRestrictedIndexPattern = () => {
  const fields = [
    createMockedField({
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
    }),
    createMockedField({
      name: 'bytes',
      type: 'number',
    }),
    createMockedField({
      name: 'source',
      type: 'string',
      scripted: true,
      esTypes: ['keyword'],
      lang: 'painless' as const,
      script: '1234',
    }),
  ];
  return {
    id: '2',
    title: 'my-fake-restricted-pattern',
    timeFieldName: 'timestamp',
    hasRestrictions: true,
    fieldFormatMap: { bytes: { id: 'bytes', params: { pattern: '0.0' } } },
    fields,
    getFieldByName: getFieldByNameFactory(fields),
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
    isPersisted: true,
    spec: {},
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
  };
};

export const createMockedIndexPatternWithoutType = (
  typeToFilter: IndexPatternField['type']
): IndexPattern => {
  const { fields, ...otherIndexPatternProps } = createMockedIndexPattern();
  const filteredFields = fields.filter(({ type }) => type !== typeToFilter);
  return {
    ...otherIndexPatternProps,
    fields: filteredFields,
    getFieldByName: getFieldByNameFactory(filteredFields),
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
  };
};

export const createMockedIndexPatternWithAdditionalFields = (
  newFields: IndexPatternField[]
): IndexPattern => {
  const { fields, ...otherIndexPatternProps } = createMockedIndexPattern();
  const completeFields = fields.concat(newFields);
  return {
    ...otherIndexPatternProps,
    fields: completeFields,
    getFieldByName: getFieldByNameFactory(completeFields),
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
  };
};
