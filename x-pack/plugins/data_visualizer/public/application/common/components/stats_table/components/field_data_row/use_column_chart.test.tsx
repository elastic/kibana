/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import '@testing-library/jest-dom/extend-expect';

import { KBN_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';

import {
  isNumericChartData,
  isOrdinalChartData,
  isUnsupportedChartData,
  NumericChartData,
  OrdinalChartData,
  UnsupportedChartData,
} from './field_histograms';

import { getFieldType, getLegendText, getXScaleType, useColumnChart } from './use_column_chart';

describe('getFieldType()', () => {
  it('should return the Kibana field type for a given EUI data grid schema', () => {
    expect(getFieldType('text')).toBe('string');
    expect(getFieldType('datetime')).toBe('date');
    expect(getFieldType('numeric')).toBe('number');
    expect(getFieldType('boolean')).toBe('boolean');
    expect(getFieldType('json')).toBe('object');
    expect(getFieldType('non-aggregatable')).toBe(undefined);
  });
});

describe('getXScaleType()', () => {
  it('should return the corresponding x axis scale type for a Kibana field type', () => {
    expect(getXScaleType(KBN_FIELD_TYPES.BOOLEAN)).toBe('ordinal');
    expect(getXScaleType(KBN_FIELD_TYPES.IP)).toBe('ordinal');
    expect(getXScaleType(KBN_FIELD_TYPES.STRING)).toBe('ordinal');
    expect(getXScaleType(KBN_FIELD_TYPES.DATE)).toBe('time');
    expect(getXScaleType(KBN_FIELD_TYPES.NUMBER)).toBe('linear');
    expect(getXScaleType(undefined)).toBe(undefined);
  });
});

const validNumericChartData: NumericChartData = {
  data: [],
  id: 'the-id',
  interval: 10,
  stats: [0, 0],
  type: 'numeric',
};

const validOrdinalChartData: OrdinalChartData = {
  cardinality: 10,
  data: [],
  id: 'the-id',
  type: 'ordinal',
};

const validUnsupportedChartData: UnsupportedChartData = { id: 'the-id', type: 'unsupported' };

describe('isNumericChartData()', () => {
  it('should return true for valid numeric chart data', () => {
    expect(isNumericChartData(validNumericChartData)).toBe(true);
  });
  it('should return false for invalid numeric chart data', () => {
    expect(isNumericChartData(undefined)).toBe(false);
    expect(isNumericChartData({})).toBe(false);
    expect(isNumericChartData({ data: [] })).toBe(false);
    expect(isNumericChartData(validOrdinalChartData)).toBe(false);
    expect(isNumericChartData(validUnsupportedChartData)).toBe(false);
  });
});

describe('isOrdinalChartData()', () => {
  it('should return true for valid ordinal chart data', () => {
    expect(isOrdinalChartData(validOrdinalChartData)).toBe(true);
  });
  it('should return false for invalid ordinal chart data', () => {
    expect(isOrdinalChartData(undefined)).toBe(false);
    expect(isOrdinalChartData({})).toBe(false);
    expect(isOrdinalChartData({ data: [] })).toBe(false);
    expect(isOrdinalChartData(validNumericChartData)).toBe(false);
    expect(isOrdinalChartData(validUnsupportedChartData)).toBe(false);
  });
});

describe('isUnsupportedChartData()', () => {
  it('should return true for unsupported chart data', () => {
    expect(isUnsupportedChartData(validUnsupportedChartData)).toBe(true);
  });
  it('should return false for invalid unsupported chart data', () => {
    expect(isUnsupportedChartData(undefined)).toBe(false);
    expect(isUnsupportedChartData({})).toBe(false);
    expect(isUnsupportedChartData({ data: [] })).toBe(false);
    expect(isUnsupportedChartData(validNumericChartData)).toBe(false);
    expect(isUnsupportedChartData(validOrdinalChartData)).toBe(false);
  });
});

describe('getLegendText()', () => {
  it('should return the chart legend text for unsupported chart types', () => {
    expect(getLegendText(validUnsupportedChartData, 20)).toBe('Chart not supported.');
  });
  it('should return the chart legend text for empty datasets', () => {
    expect(getLegendText(validNumericChartData, 20)).toBe('');
  });
  it('should return the chart legend text for boolean chart types', () => {
    const { getByText } = render(
      <>
        {getLegendText(
          {
            cardinality: 2,
            data: [
              { key: 'true', key_as_string: 'true', doc_count: 10 },
              { key: 'false', key_as_string: 'false', doc_count: 20 },
            ],
            id: 'the-id',
            type: 'boolean',
          },
          20
        )}
      </>
    );
    expect(getByText('t')).toBeInTheDocument();
    expect(getByText('f')).toBeInTheDocument();
  });
  it('should return the chart legend text for ordinal chart data with less than max categories', () => {
    expect(
      getLegendText({ ...validOrdinalChartData, data: [{ key: 'cat', doc_count: 10 }] }, 20)
    ).toBe('10 categories');
  });
  it('should return the chart legend text for ordinal chart data with more than max categories', () => {
    expect(
      getLegendText(
        {
          ...validOrdinalChartData,
          cardinality: 30,
          data: [{ key: 'cat', doc_count: 10 }],
        },
        20
      )
    ).toBe('top 20 of 30 categories');
  });
  it('should return the chart legend text for numeric datasets', () => {
    expect(
      getLegendText(
        {
          ...validNumericChartData,
          data: [{ key: 1, doc_count: 10 }],
          stats: [1, 100],
        },
        20
      )
    ).toBe('1 - 100');
    expect(
      getLegendText(
        {
          ...validNumericChartData,
          data: [{ key: 1, doc_count: 10 }],
          stats: [100, 100],
        },
        20
      )
    ).toBe('100');
    expect(
      getLegendText(
        {
          ...validNumericChartData,
          data: [{ key: 1, doc_count: 10 }],
          stats: [1.2345, 6.3456],
        },
        20
      )
    ).toBe('1.23 - 6.35');
  });
});

describe('useColumnChart()', () => {
  it('should return the column chart hook data', () => {
    const { result } = renderHook(() =>
      useColumnChart(validNumericChartData, { id: 'the-id', schema: 'numeric' }, 20)
    );

    expect(result.current.data).toStrictEqual([]);
    expect(result.current.legendText).toBe('');
    expect(result.current.xScaleType).toBe('linear');
  });
});
