/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
import { VisualizeInput } from 'src/plugins/visualizations/public';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';
import { getQueryFilters } from '../../../common/lib/build_embeddable_filters';
import { ExpressionValueFilter, TimeRange as TimeRangeArg, SeriesStyle } from '../../../types';
import { getFunctionHelp } from '../../../i18n';
import { SavedObjectReference } from '../../../../../../src/core/types';

interface Arguments {
  id: string;
  timerange: TimeRangeArg | null;
  colors: SeriesStyle[] | null;
  hideLegend: boolean | null;
  title: string | null;
}

type Output = EmbeddableExpression<VisualizeInput & { savedObjectId: string }>;

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
      title: {
        types: ['string'],
        help: argHelp.title,
        required: false,
      },
    },
    type: EmbeddableExpressionType,
    fn: (input, { id, timerange, colors, hideLegend, title }) => {
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
          savedObjectId: id,
          disableTriggers: true,
          timeRange: timerange ? omit(timerange, 'type') : defaultTimeRange,
          filters: getQueryFilters(filters),
          vis: visOptions,
          title: title === null ? undefined : title,
        },
        embeddableType: EmbeddableTypes.visualization,
        generatedAt: Date.now(),
      };
    },
    extract(state) {
      const refName = 'savedVisualization.id';
      const references: SavedObjectReference[] = [
        {
          name: refName,
          type: 'visualization',
          id: state.id[0] as string,
        },
      ];
      return {
        state: {
          ...state,
          id: [refName],
        },
        references,
      };
    },

    inject(state, references) {
      const reference = references.find((ref) => ref.name === 'savedVisualization.id');
      if (reference) {
        state.id[0] = reference.id;
      }
      return state;
    },
  };
}
