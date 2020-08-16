/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
import { VisualizeInput } from 'src/plugins/visualizations/public';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';
import { getQueryFilters } from '../../../public/lib/build_embeddable_filters';
import { ExpressionValueFilter, TimeRange as TimeRangeArg, SeriesStyle } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  id: string;
  timerange: TimeRangeArg | null;
  colors: SeriesStyle[] | null;
  hideLegend: boolean | null;
}

type Output = EmbeddableExpression<VisualizeInput>;

const defaultTimeRange = {
  from: 'now-15m',
  to: 'now',
};

export function savedVisualization(): ExpressionFunctionDefinition<
  'savedVisualization',
  ExpressionValueFilter | null,
  Arguments,
  Output
> {
  const { help, args: argHelp } = getFunctionHelp().savedVisualization;
  return {
    name: 'savedVisualization',
    help,
    args: {
      id: {
        types: ['string'],
        required: false,
        help: argHelp.id,
      },
      timerange: {
        types: ['timerange'],
        help: argHelp.timerange,
        required: false,
      },
      colors: {
        types: ['seriesStyle'],
        help: argHelp.colors,
        multi: true,
        required: false,
      },
      hideLegend: {
        types: ['boolean'],
        help: argHelp.hideLegend,
        required: false,
      },
    },
    type: EmbeddableExpressionType,
    fn: (input, { id, timerange, colors, hideLegend }) => {
      const filters = input ? input.and : [];

      const visOptions: VisualizeInput['vis'] = {};

      if (colors) {
        visOptions.colors = colors.reduce((reduction, color) => {
          if (color.label && color.color) {
            reduction[color.label] = color.color;
          }
          return reduction;
        }, {} as Record<string, string>);
      }

      if (hideLegend === true) {
        // @ts-expect-error LegendOpen missing on VisualizeInput
        visOptions.legendOpen = false;
      }

      return {
        type: EmbeddableExpressionType,
        input: {
          id,
          disableTriggers: true,
          timeRange: timerange || defaultTimeRange,
          filters: getQueryFilters(filters),
          vis: visOptions,
        },
        embeddableType: EmbeddableTypes.visualization,
        generatedAt: Date.now(),
      };
    },
  };
}
