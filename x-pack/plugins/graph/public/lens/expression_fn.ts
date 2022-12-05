/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import { MetricConfigArgs } from './expression_decoration_fn';
import { RENDERER_ID } from './expression_renderer';
import { GraphChartConfig, GraphChartProps } from './types';

type GraphChartConfigArgs = Omit<Required<GraphChartConfig>, 'metricConfig'> & MetricConfigArgs;

interface GraphChartRender {
  type: 'render';
  as: 'lens_graph_chart_renderer';
  value: GraphChartProps;
}

export type GraphChartConfigFn = ExpressionFunctionDefinition<
  'lens_graph_chart',
  Datatable,
  GraphChartConfigArgs,
  GraphChartRender
>;

export const getExpressionFunction = (): GraphChartConfigFn => ({
  name: 'lens_graph_chart',
  type: 'render',
  help: 'A graph chart. Metrics are rendered as edge weights.',
  args: {
    title: {
      types: ['string'],
      help: '',
    },
    description: {
      types: ['string'],
      help: '',
    },
    layerId: {
      types: ['string'],
      help: '',
    },
    accessor: {
      types: ['string'],
      help: 'Bucket accessor identifies the graph node values',
    },
    metrics: {
      types: ['string'],
      help: 'Metric accessors identifies the graph edge values',
      multi: true,
    },
    palette: {
      types: ['palette'],
      help: '',
    },
    metricConfig: {
      types: ['lens_graph_decoration'],
      help: '',
      multi: true,
    },
  },
  inputTypes: ['datatable'],
  fn(data, args, handlers) {
    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.reset();
      handlers.inspectorAdapters.tables.allowCsvExport = true;

      const logTable = prepareLogTable(
        data,
        [
          [
            args.accessor ? [args.accessor] : undefined,
            i18n.translate('xpack.graph.logDatatable.entities', {
              defaultMessage: 'Entities',
            }),
          ],
          ...args.metrics.map<[string[], string]>((metric) => [
            [metric],
            i18n.translate('xpack.graph.logDatatable.metric', {
              defaultMessage: 'Metric',
            }),
          ]),
        ],
        true
      );

      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }
    return {
      type: 'render',
      as: RENDERER_ID,
      value: {
        data,
        args,
      },
    };
  },
});
