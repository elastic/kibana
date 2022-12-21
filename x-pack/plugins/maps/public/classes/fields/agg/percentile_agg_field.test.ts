/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';
import type { DataView } from '@kbn/data-views-plugin/public';
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
  getAggLabel: async (aggType: AGG_TYPE, fieldName: string) => {
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

describe('percentile agg field', () => {
  test('should include percentile in name', () => {
    const field = new PercentileAggField({
      source: mockEsAggSource,
      origin: FIELD_ORIGIN.SOURCE,
      esDocField: mockEsDocField as ESDocField,
      percentile: 80,
    });
    expect(field.getName()).toEqual('agg_key_80');
  });

  test('should create percentile dsl', () => {
    const field = new PercentileAggField({
      source: mockEsAggSource,
      origin: FIELD_ORIGIN.SOURCE,
      esDocField: mockEsDocField as ESDocField,
      percentile: 80,
    });

    expect(field.getValueAggDsl(mockIndexPattern as DataView)).toEqual({
      percentiles: { field: 'foobar', percents: [80] },
    });
  });

  describe('getLabel', () => {
    test('should return percentile in label', async () => {
      const field = new PercentileAggField({
        source: mockEsAggSource,
        origin: FIELD_ORIGIN.SOURCE,
        esDocField: mockEsDocField as ESDocField,
        percentile: 80,
      });

      expect(await field.getLabel()).toEqual('80th agg_label');
    });

    test('should return median for 50th percentile', async () => {
      const field = new PercentileAggField({
        source: mockEsAggSource,
        origin: FIELD_ORIGIN.SOURCE,
        label: '',
        esDocField: mockEsDocField as ESDocField,
        percentile: 50,
      });

      expect(await field.getLabel()).toEqual('median foobar');
    });
  });

  describe('getMbFieldName', () => {
    test('should return field name when source is not MVT', () => {
      const field = new PercentileAggField({
        origin: FIELD_ORIGIN.SOURCE,
        source: {
          getAggKey: (aggType: AGG_TYPE, fieldName: string) => {
            return 'agg_key';
          },
          isMvt: () => {
            return false;
          },
        } as unknown as IESAggSource,
        esDocField: mockEsDocField as ESDocField,
        percentile: 80.5,
      });

      expect(field.getMbFieldName()).toEqual('agg_key_80.5');
    });

    test('should return field name and percentile when source is MVT', () => {
      const field = new PercentileAggField({
        origin: FIELD_ORIGIN.SOURCE,
        source: {
          getAggKey: (aggType: AGG_TYPE, fieldName: string) => {
            return 'agg_key';
          },
          isMvt: () => {
            return true;
          },
        } as unknown as IESAggSource,
        esDocField: mockEsDocField as ESDocField,
        percentile: 80.5,
      });

      expect(field.getMbFieldName()).toEqual('agg_key_80.5.values.80.5');
    });

    test('should return field name and percentile with single decimal place when source is MVT and percentile is interger', () => {
      const field = new PercentileAggField({
        origin: FIELD_ORIGIN.SOURCE,
        source: {
          getAggKey: (aggType: AGG_TYPE, fieldName: string) => {
            return 'agg_key';
          },
          isMvt: () => {
            return true;
          },
        } as unknown as IESAggSource,
        esDocField: mockEsDocField as ESDocField,
        percentile: 80,
      });

      expect(field.getMbFieldName()).toEqual('agg_key_80.values.80.0');
    });
  });
});
