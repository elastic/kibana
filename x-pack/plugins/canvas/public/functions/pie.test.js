/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testPie } from '../../canvas_plugin_src/functions/common/__fixtures__/test_pointseries';
import { fontStyle, functionWrapper } from '../../../../../src/plugins/presentation_util/public';
import {
  grayscalePalette,
  seriesStyle,
} from '../../canvas_plugin_src/functions/common/__fixtures__/test_styles';
import { pieFunctionFactory } from './pie';

describe('pie', () => {
  const fn = functionWrapper(
    pieFunctionFactory({
      get: () => ({
        getCategoricalColors: () => ['red', 'black'],
      }),
    })
  );

  it('returns a render as pie', () => {
    const result = fn(testPie);
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'pie');
  });

  describe('data', () => {
    it('has one series per unique label', () => {
      const result = fn(testPie).value.data;

      const uniqueLabels = testPie.rows.reduce(
        (unique, series) =>
          !unique.includes(series.color) ? unique.concat([series.color]) : unique,
        []
      );

      expect(result).toHaveLength(uniqueLabels.length);
      expect(result.every((series, i) => series.label === uniqueLabels[i])).toBe(true);
    });

    it('populates the data of the plot with points from the pointseries', () => {
      const result = fn(testPie).value.data;

      expect(result[0].data).toEqual([202]);
      expect(result[1].data).toEqual([67]);
      expect(result[2].data).toEqual([311]);
      expect(result[3].data).toEqual([536]);
      expect(result[4].data).toEqual([288]);
    });
  });

  describe('args', () => {
    describe('palette', () => {
      it('sets the color palette', () => {
        const mockedColors = jest.fn(() => ['#FFFFFF', '#888888', '#000000']);
        const mockedFn = functionWrapper(
          pieFunctionFactory({
            get: () => ({
              getCategoricalColors: mockedColors,
            }),
          })
        );
        const result = mockedFn(testPie, { palette: grayscalePalette }).value.options;
        expect(result).toHaveProperty('colors');
        expect(result.colors).toEqual(['#FFFFFF', '#888888', '#000000']);
        expect(mockedColors).toHaveBeenCalledWith(5, grayscalePalette.params);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{palette}'", () => {});
    });

    describe('seriesStyle', () => {
      it('sets the color for a specific series', () => {
        const result = fn(testPie, { seriesStyle: [seriesStyle] }).value;
        const seriesIndex = result.data.findIndex((series) => series.label === seriesStyle.label);
        const resultSeries = result.data[seriesIndex];

        expect(resultSeries).toHaveProperty('color', seriesStyle.color);
      });
    });

    describe('hole', () => {
      it('sets the innerRadius of the pie chart', () => {
        let result = fn(testPie, { hole: 0 }).value.options.series.pie;
        expect(result).toHaveProperty('innerRadius', 0);

        result = fn(testPie, { hole: 50 }).value.options.series.pie;
        expect(result).toHaveProperty('innerRadius', 0.5);

        result = fn(testPie, { hole: 100 }).value.options.series.pie;
        expect(result).toHaveProperty('innerRadius', 1);
      });

      it('defaults to 0 when given an invalid radius', () => {
        let result = fn(testPie).value.options.series.pie;
        expect(result).toHaveProperty('innerRadius', 0);

        result = fn(testPie, { hole: -100 }).value.options.series.pie;
        expect(result).toHaveProperty('innerRadius', 0);
      });
    });

    describe('labels', () => {
      it('shows pie labels', () => {
        const result = fn(testPie, { labels: true }).value.options.series.pie.label;
        expect(result).toHaveProperty('show', true);
      });

      it('hides pie labels', () => {
        const result = fn(testPie, { labels: false }).value.options.series.pie.label;
        expect(result).toHaveProperty('show', false);
      });

      it('defaults to true', () => {
        const result = fn(testPie).value.options.series.pie.label;
        expect(result).toHaveProperty('show', true);
      });
    });

    describe('labelRadius', () => {
      it('sets the radius of the label circle', () => {
        let result = fn(testPie, { labelRadius: 0 }).value.options.series.pie.label;
        expect(result).toHaveProperty('radius', 0);

        result = fn(testPie, { labelRadius: 50 }).value.options.series.pie.label;
        expect(result).toHaveProperty('radius', 0.5);

        result = fn(testPie, { labelRadius: 100 }).value.options.series.pie.label;
        expect(result).toHaveProperty('radius', 1);
      });

      it('defaults to 100% when given an invalid radius', () => {
        let result = fn(testPie).value.options.series.pie.label;
        expect(result).toHaveProperty('radius', 1);

        result = fn(testPie, { labelRadius: -100 }).value.options.series.pie.label;
        expect(result).toHaveProperty('radius', 1);
      });
    });

    describe('font', () => {
      it('sets the font style', () => {
        const result = fn(testPie, { font: fontStyle }).value;
        expect(result).toHaveProperty('font');
        expect(result.font).toEqual(fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{font}'", () => {});
    });
  });
});
