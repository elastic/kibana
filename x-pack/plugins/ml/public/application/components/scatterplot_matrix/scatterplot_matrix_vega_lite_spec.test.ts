/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { compile } from 'vega-lite/build-es5/vega-lite';

import euiThemeLight from '@elastic/eui/dist/eui_theme_light.json';

import {
  getColorSpec,
  getScatterplotMatrixVegaLiteSpec,
  COLOR_OUTLIER,
  COLOR_RANGE_NOMINAL,
  DEFAULT_COLOR,
  LEGEND_TYPES,
} from './scatterplot_matrix_vega_lite_spec';

describe('getColorSpec()', () => {
  it('should return the default color for non-outlier specs', () => {
    const colorSpec = getColorSpec(euiThemeLight, false);

    expect(colorSpec).toEqual({ value: DEFAULT_COLOR });
  });

  it('should return a conditional spec for outliers', () => {
    const colorSpec = getColorSpec(euiThemeLight, true);

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

    const colorSpec = getColorSpec(euiThemeLight, false, colorName, LEGEND_TYPES.NOMINAL);

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
    expect(vegaLiteSpec.spec.transform).toEqual([
      { as: 'x', calculate: "datum['x']" },
      { as: 'y', calculate: "datum['y']" },
    ]);
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
    expect(vegaLiteSpec.spec.transform).toEqual([
      { as: 'x', calculate: "datum['x']" },
      { as: 'y', calculate: "datum['y']" },
      {
        as: 'outlier_score',
        calculate: "datum['ml.outlier_score']",
      },
    ]);
    expect(vegaLiteSpec.spec.data.values).toEqual(data);
    expect(vegaLiteSpec.spec.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(vegaLiteSpec.spec.encoding.color).toEqual({
      condition: {
        test: "(datum['outlier_score'] >= mlOutlierScoreThreshold.cutoff)",
        value: COLOR_OUTLIER,
      },
      value: euiThemeLight.euiColorMediumShade,
    });
    expect(vegaLiteSpec.spec.encoding.tooltip).toEqual([
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
      {
        field: 'outlier_score',
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
    expect(vegaLiteSpec.spec.transform).toEqual([
      { as: 'x', calculate: "datum['x']" },
      { as: 'y', calculate: "datum['y']" },
    ]);
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
});
