/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CountAggField } from './count_agg_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';
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
  aggType: AGG_TYPE.COUNT,
  origin: FIELD_ORIGIN.SOURCE,
};

describe('supportsFieldMeta', () => {
  test('Counting aggregations should not support field meta', () => {
    const countMetric = new CountAggField({ ...defaultParams });
    expect(countMetric.supportsFieldMeta()).toBe(false);
  });
});
