/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaletteOutput } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DecorationState, GraphDecorationResult } from './expression_decoration_fn';

export type MetricConfig = DecorationState;

export interface GraphState {
  layerId: string;
  accessor?: string;
  metrics?: string[];
  palette?: PaletteOutput;
  metricConfig: MetricConfig[];
}

export interface GraphChartConfig extends GraphState {
  title: string;
  description: string;
}

export interface GraphStateOutput extends Omit<GraphState, 'metricConfig'> {
  metricConfig: GraphDecorationResult[];
}

export interface GraphChartProps {
  data: Datatable;
  args: GraphStateOutput;
}
