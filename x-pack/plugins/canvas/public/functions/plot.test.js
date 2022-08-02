/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fontStyle, functionWrapper } from '@kbn/presentation-util-plugin/public';
import { testPlot } from '../../canvas_plugin_src/functions/common/__fixtures__/test_pointseries';
import {
  grayscalePalette,
  yAxisConfig,
  xAxisConfig,
  seriesStyle,
  defaultStyle,
} from '../../canvas_plugin_src/functions/common/__fixtures__/test_styles';
import { plotFunctionFactory } from './plot';

describe('plot', () => {
  const fn = functionWrapper(
    plotFunctionFactory({
      get: () => ({
        getCategoricalColors: () => ['red', 'black'],
      }),
    })
  );

  it('returns a render as plot', () => {
    const result = fn(testPlot);
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'plot');
  });

  describe('data', () => {
    it('is sorted by the series labels', () => {
      const result = fn(testPlot).value.data;

      expect(result.every((val, i) => (!!i ? val.label >= result[i - 1].label : true))).toBe(true);
    });

    it('has one series per unique label', () => {
      const result = fn(testPlot).value.data;

      const uniqueLabels = testPlot.rows
        .reduce(
          (unique, series) =>
            !unique.includes(series.color) ? unique.concat([series.color]) : unique,
          []
        )
        .sort();

      expect(result).toHaveLength(uniqueLabels.length);
      expect(result.every((series, i) => series.label === uniqueLabels[i])).toBe(true);
    });

    it('populates the data of the plot with points from the pointseries', () => {
      const result = fn(testPlot).value.data;

      expect(result[0].data).toEqual([
        [1517842800950, 605, { size: 100, text: 605 }],
        [1517929200950, 583, { size: 200, text: 583 }],
      ]);

      expect(result[1].data).toEqual([
        [1517842800950, 216, { size: 350, text: 216 }],
        [1517929200950, 200, { size: 256, text: 200 }],
      ]);

      expect(result[2].data).toEqual([[1517842800950, 67, { size: 240, text: 67 }]]);

      expect(result[3].data).toEqual([[1517842800950, 311, { size: 447, text: 311 }]]);
    });
  });

  describe('args', () => {
    describe('seriesStyle', () => {
      it('sets the seriesStyle for a specific series', () => {
        const result = fn(testPlot, { seriesStyle: [seriesStyle] }).value;
        const seriesIndex = result.data.findIndex((series) => series.label === seriesStyle.label);
        const resultSeries = result.data[seriesIndex];

        expect(resultSeries.lines).toHaveProperty('lineWidth', seriesStyle.lines);
        expect(resultSeries.lines).toHaveProperty('show', false);
        expect(resultSeries.lines).toHaveProperty('fillColor', seriesStyle.color);
        expect(resultSeries.lines).toHaveProperty('fill', seriesStyle.fill / 10);

        expect(resultSeries.bars).toHaveProperty('show', false);
        expect(resultSeries.bars).toHaveProperty('barWidth', seriesStyle.bars);
        expect(resultSeries.bars).toHaveProperty('horizontal', seriesStyle.horizontalBars);

        expect(resultSeries.bubbles).toHaveProperty('fill', seriesStyle.fill);

        expect(resultSeries).toHaveProperty('stack', seriesStyle.stack);
        expect(resultSeries).toHaveProperty('color', seriesStyle.color);
      });
    });

    describe('defaultStyle', () => {
      it('sets the default seriesStyle for the entire plot', () => {
        const results = fn(testPlot, { defaultStyle: defaultStyle });
        const defaultSeriesConfig = results.value.options.series;

        expect(defaultSeriesConfig.lines).toHaveProperty('lineWidth', defaultStyle.lines);
        expect(defaultSeriesConfig.lines).toHaveProperty('show', false);
        expect(defaultSeriesConfig.lines).toHaveProperty('fillColor', defaultStyle.color);
        expect(defaultSeriesConfig.lines).toHaveProperty('fill', defaultStyle.fill / 10);

        expect(defaultSeriesConfig.bars).toHaveProperty('show', false);
        expect(defaultSeriesConfig.bars).toHaveProperty('barWidth', defaultStyle.bars);
        expect(defaultSeriesConfig.bars).toHaveProperty('horizontal', defaultStyle.horizontalBars);

        expect(defaultSeriesConfig.bubbles).toHaveProperty('fill', defaultStyle.fill);

        expect(defaultSeriesConfig).not.toHaveProperty('stack');
        expect(defaultSeriesConfig).not.toHaveProperty('color');
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{seriesStyle points=5}'", () => {});
    });

    describe('palette', () => {
      it('sets the color palette', () => {
        const mockedColors = jest.fn(() => ['#FFFFFF', '#888888', '#000000']);

        const mockedFn = functionWrapper(
          plotFunctionFactory({
            get: () => ({
              getCategoricalColors: mockedColors,
            }),
          })
        );
        const result = mockedFn(testPlot, { palette: grayscalePalette }).value.options;
        expect(result).toHaveProperty('colors');
        expect(result.colors).toEqual(['#FFFFFF', '#888888', '#000000']);
        expect(mockedColors).toHaveBeenCalledWith(4, grayscalePalette.params);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{palette}'", () => {});
    });

    describe('font', () => {
      it('sets the font style', () => {
        const result = fn(testPlot, { font: fontStyle }).value;
        const style = {
          size: 14,
          lHeight: 21,
          style: 'normal',
          weight: 'bolder',
          family: 'Chalkboard, serif',
          color: 'pink',
        };
        expect(result.options.xaxis.font).toEqual(style);
        expect(result.options.yaxis.font).toEqual(style);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{font}'", () => {});
    });

    describe('legend', () => {
      it('hides the legend', () => {
        const result = fn(testPlot, { legend: false }).value.options;
        expect(Object.keys(result.legend)).toHaveLength(1);
        expect(result.legend).toHaveProperty('show', false);
      });

      it('sets the position of the legend', () => {
        let result = fn(testPlot, { legend: 'nw' }).value.options;
        expect(result.legend).toHaveProperty('position', 'nw');

        result = fn(testPlot, { legend: 'ne' }).value.options;
        expect(result.legend).toHaveProperty('position', 'ne');

        result = fn(testPlot, { legend: 'sw' }).value.options;
        expect(result.legend).toHaveProperty('position', 'sw');

        result = fn(testPlot, { legend: 'se' }).value.options;
        expect(result.legend).toHaveProperty('position', 'se');
      });

      it("defaults to 'ne' if invalid position is provided", () => {
        let result = fn(testPlot).value.options;
        expect(result.legend).toHaveProperty('position', 'ne');

        result = fn(testPlot, { legend: true }).value.options;
        expect(result.legend).toHaveProperty('position', 'ne');

        result = fn(testPlot, { legend: 'foo' }).value.options;
        expect(result.legend).toHaveProperty('position', 'ne');
      });
    });

    describe('yaxis', () => {
      it('sets visibility of the y-axis labels', () => {
        let result = fn(testPlot, { yaxis: true }).value.options;
        expect(result.yaxis).toHaveProperty('show', true);

        result = fn(testPlot, { yaxis: false }).value.options;
        expect(result.yaxis).toHaveProperty('show', false);
      });

      it('configures the y-axis with an AxisConfig', () => {
        const result = fn(testPlot, { yaxis: yAxisConfig }).value.options;
        expect(result.yaxis).toHaveProperty('show', true);
        expect(result.yaxis).toHaveProperty('position', 'right');
      });

      it("defaults to 'true' if not provided", () => {
        const result = fn(testPlot).value.options;
        expect(result.yaxis).toHaveProperty('show', true);
      });
    });

    describe('xaxis', () => {
      it('sets visibility of the x-axis labels', () => {
        let result = fn(testPlot, { xaxis: true }).value.options;
        expect(result.xaxis).toHaveProperty('show', true);

        result = fn(testPlot, { xaxis: false }).value.options;
        expect(result.xaxis).toHaveProperty('show', false);
      });

      it('configures the x-axis with an AxisConfig', () => {
        const result = fn(testPlot, { xaxis: xAxisConfig }).value.options;
        expect(result.xaxis).toHaveProperty('show', true);
        expect(result.xaxis).toHaveProperty('position', 'top');
      });

      it("defaults to 'true' if not provided", () => {
        const result = fn(testPlot).value.options;
        expect(result.xaxis).toHaveProperty('show', true);
      });
    });
  });
});
