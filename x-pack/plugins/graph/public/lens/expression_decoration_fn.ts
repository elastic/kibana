/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';

export interface MetricConfigArgs {
  metricConfig: GraphDecorationResult[];
}

export interface DecorationState {
  metricId: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  mapValuesTo?: 'size' | 'color';
  maxWidth?: number;
}

export type DecorationConfigArg = Omit<DecorationState, 'palette'> & {
  palette?: PaletteOutput<CustomPaletteState>;
};

export type GraphDecorationResult = DecorationConfigArg & { type: 'lens_graph_decoration' };
export type GraphDecorationFunction = ExpressionFunctionDefinition<
  'lens_graph_decoration',
  null,
  DecorationConfigArg,
  GraphDecorationResult
>;

export const graphDecorationFn: GraphDecorationFunction = {
  name: 'lens_graph_decoration',
  aliases: [],
  type: 'lens_graph_decoration',
  help: '',
  inputTypes: ['null'],
  args: {
    metricId: { types: ['string'], help: '' },
    mapValuesTo: { types: ['string'], help: '', options: ['size', 'color'] },
    palette: {
      types: ['palette'],
      help: '',
    },
    maxWidth: { types: ['number'], help: '' },
  },
  fn: function fn(input, args) {
    return {
      type: 'lens_graph_decoration',
      ...args,
    };
  },
};
