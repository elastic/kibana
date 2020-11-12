/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFieldedAggField } from './es_fielded_agg_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../common/constants';
import { IESAggSource } from '../sources/es_agg_source';
import { IIndexPattern } from 'src/plugins/data/public';

const mockIndexPattern = {
  title: 'wildIndex',
  fields: [
    {
      name: 'foo*',
    },
  ],
} as IIndexPattern;

const mockEsAggSource = {
  getAggKey: (aggType: AGG_TYPE, fieldName: string) => {
    return 'agg_key';
  },
  getAggLabel: (aggType: AGG_TYPE, fieldName: string) => {
    return 'agg_label';
  },
  getIndexPattern: async () => {
    return mockIndexPattern;
  },
} as IESAggSource;

const defaultParams = {
  label: 'my agg field',
  source: mockEsAggSource,
  origin: FIELD_ORIGIN.SOURCE,
};

describe('supportsFieldMeta', () => {
  test('Non-counting aggregations should support field meta', () => {
    const avgMetric = new ESFieldedAggField({ ...defaultParams, aggType: AGG_TYPE.AVG });
    expect(avgMetric.supportsFieldMeta()).toBe(true);
    const maxMetric = new ESFieldedAggField({ ...defaultParams, aggType: AGG_TYPE.MAX });
    expect(maxMetric.supportsFieldMeta()).toBe(true);
    const minMetric = new ESFieldedAggField({ ...defaultParams, aggType: AGG_TYPE.MIN });
    expect(minMetric.supportsFieldMeta()).toBe(true);
    const termsMetric = new ESFieldedAggField({ ...defaultParams, aggType: AGG_TYPE.TERMS });
    expect(termsMetric.supportsFieldMeta()).toBe(true);
  });

  test('Counting aggregations should not support field meta', () => {
    const sumMetric = new ESFieldedAggField({ ...defaultParams, aggType: AGG_TYPE.SUM });
    expect(sumMetric.supportsFieldMeta()).toBe(false);
    const uniqueCountMetric = new ESFieldedAggField({
      ...defaultParams,
      aggType: AGG_TYPE.UNIQUE_COUNT,
    });
    expect(uniqueCountMetric.supportsFieldMeta()).toBe(false);
  });
});
