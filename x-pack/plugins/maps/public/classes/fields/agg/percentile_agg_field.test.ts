/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';
import { IndexPattern } from '@kbn/data-plugin/public';
import { PercentileAggField } from './percentile_agg_field';
import { ESDocField } from '../es_doc_field';

const mockFields = [
  {
    name: 'foo*',
  },
];
// @ts-expect-error
mockFields.getByName = (name: string) => {
  return {
    name,
  };
};

const mockIndexPattern = {
  title: 'wildIndex',
  fields: mockFields,
};

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

const mockEsDocField = {
  getName() {
    return 'foobar';
  },
};

const defaultParams = {
  source: mockEsAggSource,
  origin: FIELD_ORIGIN.SOURCE,
};

describe('percentile agg field', () => {
  test('should include percentile in name', () => {
    const field = new PercentileAggField({
      ...defaultParams,
      esDocField: mockEsDocField as ESDocField,
      percentile: 80,
    });
    expect(field.getName()).toEqual('agg_key_80');
  });

  test('should create percentile dsl', () => {
    const field = new PercentileAggField({
      ...defaultParams,
      esDocField: mockEsDocField as ESDocField,
      percentile: 80,
    });

    expect(field.getValueAggDsl(mockIndexPattern as IndexPattern)).toEqual({
      percentiles: { field: 'foobar', percents: [80] },
    });
  });

  test('label', async () => {
    const field = new PercentileAggField({
      ...defaultParams,
      esDocField: mockEsDocField as ESDocField,
      percentile: 80,
    });

    expect(await field.getLabel()).toEqual('80th agg_label');
  });

  test('label (median)', async () => {
    const field = new PercentileAggField({
      ...defaultParams,
      label: '',
      esDocField: mockEsDocField as ESDocField,
      percentile: 50,
    });

    expect(await field.getLabel()).toEqual('median foobar');
  });
});
