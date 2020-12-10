/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggField } from './agg_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';

const mockEsAggSource = ({} as unknown) as IESAggSource;

const defaultParams = {
  label: 'my agg field',
  source: mockEsAggSource,
  origin: FIELD_ORIGIN.SOURCE,
};

describe('supportsFieldMeta', () => {
  test('Non-counting aggregations should support field meta', () => {
    const avgMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.AVG });
    expect(avgMetric.supportsFieldMeta()).toBe(true);
    const maxMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.MAX });
    expect(maxMetric.supportsFieldMeta()).toBe(true);
    const minMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.MIN });
    expect(minMetric.supportsFieldMeta()).toBe(true);
    const termsMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.TERMS });
    expect(termsMetric.supportsFieldMeta()).toBe(true);
  });

  test('Counting aggregations should not support field meta', () => {
    const sumMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.SUM });
    expect(sumMetric.supportsFieldMeta()).toBe(false);
    const uniqueCountMetric = new AggField({
      ...defaultParams,
      aggType: AGG_TYPE.UNIQUE_COUNT,
    });
    expect(uniqueCountMetric.supportsFieldMeta()).toBe(false);
  });
});
