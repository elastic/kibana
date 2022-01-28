/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';

// @ts-ignore
import { compile } from 'vega-lite/build/vega-lite';

import { euiLightVars as euiThemeLight } from '@kbn/ui-theme';

import { LEGEND_TYPES } from '../vega_chart/common';

import {
  getColorSpec,
  getScatterplotMatrixVegaLiteSpec,
  COLOR_OUTLIER,
  COLOR_RANGE_NOMINAL,
  DEFAULT_COLOR,
} from './scatterplot_matrix_vega_lite_spec';

describe('getColorSpec()', () => {
  it('should return the default color for non-outlier specs', () => {
    const colorSpec = getColorSpec(euiThemeLight);

    expect(colorSpec).toEqual({ value: DEFAULT_COLOR });
  });

  it('should return a conditional spec for outliers', () => {
    const colorSpec = getColorSpec(euiThemeLight, 'outlier_score');

    expect(colorSpec).toEqual({
      condition: {
        test: "(datum['outlier_score'] >= mlOutlierScoreThreshold.cutoff)",
        value: COLOR_OUTLIER,
      },
      value: euiThemeLight.euiColorMediumShade,
    });
  });

  it('should return a field based spec for non-outlier specs with legendType supplied', () => {
    const colorName = 'the-color-field';

    const colorSpec = getColorSpec(euiThemeLight, undefined, colorName, LEGEND_TYPES.NOMINAL);

    expect(colorSpec).toEqual({
      field: colorName,
      scale: {
        range: COLOR_RANGE_NOMINAL,
      },
      type: 'nominal',
    });
  });
});

describe('getScatterplotMatrixVegaLiteSpec()', () => {
  it('should return the default spec for non-outliers without a legend', () => {
    const data = [{ x: 1, y: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(data, ['x', 'y'], euiThemeLight);

    // A valid Vega Lite spec shouldn't throw an error when compiled.
    expect(() => compile(vegaLiteSpec)).not.toThrow();

    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x', 'y'],
      row: ['y', 'x'],
    });
    expect(vegaLiteSpec.spec.data.values).toEqual(data);
    expect(vegaLiteSpec.spec.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(vegaLiteSpec.spec.encoding.color).toEqual({ value: DEFAULT_COLOR });
    expect(vegaLiteSpec.spec.encoding.tooltip).toEqual([
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ]);
  });

  it('should return the spec for outliers', () => {
    const data = [{ x: 1, y: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(data, ['x', 'y'], euiThemeLight, 'ml');

    // A valid Vega Lite spec shouldn't throw an error when compiled.
    expect(() => compile(vegaLiteSpec)).not.toThrow();

    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x', 'y'],
      row: ['y', 'x'],
    });
    expect(vegaLiteSpec.spec.data.values).toEqual(data);
    expect(vegaLiteSpec.spec.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(vegaLiteSpec.spec.encoding.color).toEqual({
      condition: {
        // Note the escaped dot character
        test: "(datum['ml\\.outlier_score'] >= mlOutlierScoreThreshold.cutoff)",
        value: COLOR_OUTLIER,
      },
      value: euiThemeLight.euiColorMediumShade,
    });
    expect(vegaLiteSpec.spec.encoding.tooltip).toEqual([
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
      {
        // Note the escaped dot character
        field: 'ml\\.outlier_score',
        format: '.3f',
        type: 'quantitative',
      },
    ]);
  });

  it('should return the spec for classification', () => {
    const data = [{ x: 1, y: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(
      data,
      ['x', 'y'],
      euiThemeLight,
      undefined,
      'the-color-field',
      LEGEND_TYPES.NOMINAL
    );

    // A valid Vega Lite spec shouldn't throw an error when compiled.
    expect(() => compile(vegaLiteSpec)).not.toThrow();

    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x', 'y'],
      row: ['y', 'x'],
    });
    expect(vegaLiteSpec.spec.data.values).toEqual(data);
    expect(vegaLiteSpec.spec.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(vegaLiteSpec.spec.encoding.color).toEqual({
      field: 'the-color-field',
      scale: {
        range: COLOR_RANGE_NOMINAL,
      },
      type: 'nominal',
    });
    expect(vegaLiteSpec.spec.encoding.tooltip).toEqual([
      { field: 'the-color-field', type: 'nominal' },
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ]);
  });

  it('should escape special characters', () => {
    const data = [{ ['x.a']: 1, ['y[a]']: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(
      data,
      ['x.a', 'y[a]'],
      euiThemeLight,
      undefined,
      'the-color-field',
      LEGEND_TYPES.NOMINAL
    );

    // column values should be escaped
    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x\\.a', 'y\\[a\\]'],
      row: ['y\\[a\\]', 'x\\.a'],
    });
    // raw data should not be escaped
    expect(vegaLiteSpec.spec.data.values).toEqual(data);
  });
});
