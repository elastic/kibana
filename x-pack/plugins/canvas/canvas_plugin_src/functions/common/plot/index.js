/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import keyBy from 'lodash.keyby';
import { groupBy, get, set, map, sortBy } from 'lodash';
import { getColorsFromPalette } from '../../../../common/lib/get_colors_from_palette';
import { getLegendConfig } from '../../../../common/lib/get_legend_config';
import { getFlotAxisConfig } from './get_flot_axis_config';
import { getFontSpec } from './get_font_spec';
import { seriesStyleToFlot } from './series_style_to_flot';
import { getTickHash } from './get_tick_hash';

export const plot = () => ({
  name: 'plot',
  aliases: [],
  type: 'render',
  help: 'Configure a plot element',
  context: {
    types: ['pointseries'],
  },
  args: {
    seriesStyle: {
      multi: true,
      types: ['seriesStyle', 'null'],
      help: 'A style of a specific series',
    },
    defaultStyle: {
      multi: false,
      types: ['seriesStyle'],
      help: 'The default style to use for every series',
      default: '{seriesStyle points=5}',
    },
    palette: {
      types: ['palette'],
      help: 'A palette object for describing the colors to use on this plot',
      default: '{palette}',
    },
    font: {
      types: ['style'],
      help: 'Legend and tick mark fonts',
      default: '{font}',
    },
    legend: {
      types: ['string', 'boolean'],
      help: 'Legend position, nw, sw, ne, se or false',
      default: 'ne',
      options: ['nw', 'sw', 'ne', 'se', false],
    },
    yaxis: {
      types: ['boolean', 'axisConfig'],
      help: 'Axis configuration, or false to disable',
      default: true,
    },
    xaxis: {
      types: ['boolean', 'axisConfig'],
      help: 'Axis configuration, or false to disable',
      default: true,
    },
  },
  fn: (context, args) => {
    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};
    const sortedRows = sortBy(context.rows, ['x', 'y', 'color', 'size', 'text']);
    const ticks = getTickHash(context.columns, sortedRows);
    const font = args.font ? getFontSpec(args.font) : {};

    const data = map(groupBy(sortedRows, 'color'), (series, label) => {
      const seriesStyle = {
        ...args.defaultStyle,
        ...seriesStyles[label],
      };
      const flotStyle = seriesStyle ? seriesStyleToFlot(seriesStyle) : {};

      return {
        ...flotStyle,
        label: label,
        data: series.map(point => {
          const attrs = {};
          const x = get(context.columns, 'x.type') === 'string' ? ticks.x.hash[point.x] : point.x;
          const y = get(context.columns, 'y.type') === 'string' ? ticks.y.hash[point.y] : point.y;

          if (point.size != null) {
            attrs.size = point.size;
          } else if (get(seriesStyle, 'points')) {
            attrs.size = seriesStyle.points;
            set(flotStyle, 'bubbles.size.min', seriesStyle.points);
          }

          if (point.text != null) attrs.text = point.text;

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

    const result = {
      type: 'render',
      as: 'plot',
      value: {
        font: args.font,
        data: sortBy(data, 'label'),
        options: {
          canvas: false,
          colors: getColorsFromPalette(args.palette, data.length),
          legend: getLegendConfig(args.legend, data.length),
          grid: gridConfig,
          xaxis: getFlotAxisConfig('x', args.xaxis, {
            columns: context.columns,
            ticks,
            font,
          }),
          yaxis: getFlotAxisConfig('y', args.yaxis, {
            columns: context.columns,
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
    return JSON.parse(JSON.stringify(result));
  },
});
