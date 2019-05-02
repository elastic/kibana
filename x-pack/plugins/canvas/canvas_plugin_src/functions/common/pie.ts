/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map, groupBy } from 'lodash';
// @ts-ignore lodash.keyby imports invalid member from @types/lodash
import keyBy from 'lodash.keyby';
// @ts-ignore untyped local
import { getColorsFromPalette } from '../../../common/lib/get_colors_from_palette';
// @ts-ignore untyped local
import { getLegendConfig } from '../../../common/lib/get_legend_config';
import {
  ContextFunction,
  Legend,
  Palette,
  PointSeries,
  Render,
  SeriesStyle,
  Style,
} from '../types';

interface PieSeriesOptions {
  show: boolean;
  innerRadius: number;
  stroke: {
    width: number;
  };
  label: {
    show: boolean;
    radius: number;
  };
  tilt: number;
  radius: number | 'auto';
}

interface PieOptions {
  canvas: boolean;
  colors: string[];
  legend: {
    show: boolean;
    backgroundOpacity: number;
    labelBoxBorderColor: string;
    position: Legend;
  };
  grid: {
    show: boolean;
  };
  series: {
    pie: PieSeriesOptions;
  };
}

interface PieData {
  label: string;
  data: number[];
  color?: string;
}

interface Pie {
  font: Style;
  data: PieData[];
  options: PieOptions;
}

interface Arguments {
  palette: Palette | null;
  seriesStyle: SeriesStyle[] | null;
  radius: number | 'auto';
  hole: number;
  labels: boolean;
  labelRadius: number;
  font: Style;
  legend: Legend | false;
  tilt: number;
}

export function pie(): ContextFunction<'pie', PointSeries, Arguments, Render<Pie>> {
  return {
    name: 'pie',
    aliases: [],
    type: 'render',
    help: 'Configure a pie chart element',
    context: {
      types: ['pointseries'],
    },
    args: {
      palette: {
        types: ['palette', 'null'],
        help: 'A palette object for describing the colors to use on this pie',
        default: '{palette}',
      },
      seriesStyle: {
        multi: true,
        types: ['seriesStyle', 'null'],
        help: 'A style of a specific series',
      },
      radius: {
        types: ['string', 'number'],
        help: `Radius of the pie as a percentage (between 0 and 1) of the available space. Set to 'auto' to automatically set radius`,
        default: 'auto',
      },
      hole: {
        types: ['number'],
        default: 0,
        help: 'Draw a hole in the pie, 0-100, as a percentage of the pie radius',
      },
      labels: {
        types: ['boolean'],
        default: true,
        help: 'Show pie labels',
        options: [true, false],
      },
      labelRadius: {
        types: ['number'],
        default: 100,
        help: 'Percentage of area of container to use as radius for the label circle',
      },
      font: {
        types: ['style'],
        help: 'Label font',
        default: '{font}',
      },
      legend: {
        types: ['string', 'boolean'],
        help: 'Legend position, nw, sw, ne, se or false',
        default: false,
        options: ['nw', 'sw', 'ne', 'se', false],
      },
      tilt: {
        types: ['number'],
        default: 1,
        help: 'Percentage of tilt where 1 is fully vertical and 0 is completely flat',
      },
    },
    fn: (context, args) => {
      const { tilt, radius, labelRadius, labels, hole, legend, palette, font, seriesStyle } = args;
      const seriesStyles = keyBy(seriesStyle || [], 'label') || {};

      const data: PieData[] = map(groupBy(context.rows, 'color'), (series, label = '') => {
        const item: PieData = {
          label,
          data: series.map(point => point.size || 1),
        };

        const style = seriesStyles[label];

        // append series style, if there is a match
        if (style) {
          item.color = get(style, 'color');
        }

        return item;
      });

      return {
        type: 'render',
        as: 'pie',
        value: {
          font,
          data,
          options: {
            canvas: false,
            colors: getColorsFromPalette(palette, data.length),
            legend: getLegendConfig(legend, data.length),
            grid: {
              show: false,
            },
            series: {
              pie: {
                show: true,
                innerRadius: Math.max(hole, 0) / 100,
                stroke: {
                  width: 0,
                },
                label: {
                  show: labels,
                  radius: (labelRadius >= 0 ? labelRadius : 100) / 100,
                },
                tilt,
                radius,
              },
              bubbles: {
                show: false,
              },
              shadowSize: 0,
            },
          },
        },
      };
    },
  };
}
