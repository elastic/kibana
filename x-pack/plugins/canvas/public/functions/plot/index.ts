/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { groupBy, get, keyBy, map, sortBy } from 'lodash';
import { ExpressionFunctionDefinition, Style } from '@kbn/expressions-plugin';
import type { PaletteRegistry, PaletteOutput } from '@kbn/coloring';
import { getLegendConfig } from '../../../common/lib/get_legend_config';
import { getFlotAxisConfig } from './get_flot_axis_config';
import { getFontSpec } from './get_font_spec';
import { seriesStyleToFlot } from './series_style_to_flot';
import { getTickHash } from './get_tick_hash';
import { getFunctionHelp } from '../../../i18n';
import { AxisConfig, PointSeries, Render, SeriesStyle, Legend } from '../../../types';

export interface Arguments {
  seriesStyle: SeriesStyle[];
  defaultStyle: SeriesStyle;
  palette: PaletteOutput;
  font: Style;
  legend: Legend | boolean;
  xaxis: AxisConfig | boolean;
  yaxis: AxisConfig | boolean;
}

export function plotFunctionFactory(
  paletteService: PaletteRegistry
): () => ExpressionFunctionDefinition<'plot', PointSeries, Arguments, Render<any>> {
  return () => {
    const { help, args: argHelp } = getFunctionHelp().plot;

    return {
      name: 'plot',
      aliases: [],
      type: 'render',
      inputTypes: ['pointseries'],
      help,
      args: {
        defaultStyle: {
          multi: false,
          types: ['seriesStyle'],
          help: argHelp.defaultStyle,
          default: '{seriesStyle points=5}',
        },
        font: {
          types: ['style'],
          help: argHelp.font,
          default: '{font}',
        },
        legend: {
          types: ['string', 'boolean'],
          help: argHelp.legend,
          default: 'ne',
          options: [...Object.values(Legend), false],
        },
        palette: {
          types: ['palette'],
          help: argHelp.palette,
          default: '{palette}',
        },
        seriesStyle: {
          multi: true,
          types: ['seriesStyle'],
          help: argHelp.seriesStyle,
        },
        xaxis: {
          types: ['boolean', 'axisConfig'],
          help: argHelp.xaxis,
          default: true,
        },
        yaxis: {
          types: ['boolean', 'axisConfig'],
          help: argHelp.yaxis,
          default: true,
        },
      },
      fn: (input, args) => {
        const seriesStyles: { [key: string]: SeriesStyle } =
          keyBy(args.seriesStyle || [], 'label') || {};
        const sortedRows = input.rows;
        const ticks = getTickHash(input.columns, sortedRows);
        const font = args.font ? getFontSpec(args.font) : {};

        const data = map(groupBy(sortedRows, 'color'), (series, label) => {
          const seriesStyle = {
            ...args.defaultStyle,
            ...seriesStyles[label as string],
          };

          const flotStyle = seriesStyle ? seriesStyleToFlot(seriesStyle) : {};

          return {
            ...flotStyle,
            label,
            data: series.map((point) => {
              const attrs: {
                size?: number;
                text?: string;
              } = {};

              const x = get(input.columns, 'x.type') === 'string' ? ticks.x.hash[point.x] : point.x;
              const y = get(input.columns, 'y.type') === 'string' ? ticks.y.hash[point.y] : point.y;

              if (point.size != null) {
                attrs.size = point.size;
              } else if (get(seriesStyle, 'points')) {
                attrs.size = seriesStyle.points;
                set(flotStyle, 'bubbles.size.min', seriesStyle.points);
              }

              if (point.text != null) {
                attrs.text = point.text;
              }

              return [x, y, attrs];
            }),
          };
        });

        const gridConfig = {
          borderWidth: 0,
          borderColor: null,
          color: 'rgba(0,0,0,0)',
          labelMargin: 30,
          margin: {
            right: 30,
            top: 20,
            bottom: 0,
            left: 0,
          },
        };

        const output = {
          type: 'render',
          as: 'plot',
          value: {
            font: args.font,
            data: sortBy(data, 'label'),
            options: {
              canvas: false,
              colors: paletteService
                .get(args.palette.name || 'custom')
                .getCategoricalColors(data.length, args.palette.params),
              legend: getLegendConfig(args.legend, data.length),
              grid: gridConfig,
              xaxis: getFlotAxisConfig('x', args.xaxis, {
                columns: input.columns,
                ticks,
                font,
              }),
              yaxis: getFlotAxisConfig('y', args.yaxis, {
                columns: input.columns,
                ticks,
                font,
              }),
              series: {
                shadowSize: 0,
                ...seriesStyleToFlot(args.defaultStyle),
              },
            },
          },
        };

        // fix the issue of plot sometimes re-rendering with an empty chart
        // TODO: holy hell, why does this work?! the working theory is that some values become undefined
        // and serializing the result here causes them to be dropped off, and this makes flot react differently.
        // It's also possible that something else ends up mutating this object, but that seems less likely.
        return JSON.parse(JSON.stringify(output));
      },
    };
  };
}
