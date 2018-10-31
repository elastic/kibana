/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import keyBy from 'lodash.keyby';
import { get, map, groupBy, sortBy } from 'lodash';
import { getColorsFromPalette } from '../../../common/lib/get_colors_from_palette';
import { getLegendConfig } from '../../../common/lib/get_legend_config';

export const pie = () => ({
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
      type: ['string', 'number'],
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
    const rows = sortBy(context.rows, ['color', 'size']);
    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};

    const data = map(groupBy(rows, 'color'), (series, label) => {
      const item = {
        label: label,
        data: series.map(point => point.size || 1),
      };

      const seriesStyle = seriesStyles[label];

      // append series style, if there is a match
      if (seriesStyle) item.color = get(seriesStyle, 'color');

      return item;
    });

    return {
      type: 'render',
      as: 'pie',
      value: {
        font: args.font,
        data: sortBy(data, 'label'),
        options: {
          canvas: false,
          colors: getColorsFromPalette(args.palette, data.length),
          legend: getLegendConfig(args.legend, data.length),
          grid: {
            show: false,
          },
          series: {
            pie: {
              show: true,
              innerRadius: Math.max(args.hole, 0) / 100,
              stroke: {
                width: 0,
              },
              label: {
                show: args.labels,
                radius: (args.labelRadius >= 0 ? args.labelRadius : 100) / 100,
              },
              tilt: args.tilt,
              radius: args.radius,
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
});
