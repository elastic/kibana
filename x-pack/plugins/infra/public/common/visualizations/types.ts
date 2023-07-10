/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewBase, Filter } from '@kbn/es-query';
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  MetricVisualizationState,
  TypedLensByValueInput,
  XYState,
} from '@kbn/lens-plugin/public';
import { hostLensFormulas, visualizationTypes } from './constants';

export type LensAttributes = TypedLensByValueInput['attributes'];

export interface LensOptions {
  title: string;
}
export interface LineChartOptions extends LensOptions {
  breakdownSize?: number;
}
export interface MetricChartOptions extends LensOptions {
  subtitle?: string;
  showTitle?: boolean;
  showTrendLine?: boolean;
  backgroundColor?: string;
  decimals?: number;
}

export interface LensLineChartConfig {
  extraVisualizationState?: Partial<Omit<XYState, 'layers'> & { layers: XYState['layers'] }>;
  extraLayers?: FormBasedPersistedState['layers'];
  extraReference?: string;
}
export interface LensChartConfig {
  title: string;
  formula: Formula;
  lineChartConfig?: LensLineChartConfig;
  getFilters: ({ id }: Pick<DataViewBase, 'id'>) => Filter[];
}

export type TVisualization = XYState | MetricVisualizationState;
export interface VisualizationAttributes<T extends TVisualization> {
  getTitle(): string;
  getVisualizationType(): string;
  getLayers(): FormBasedPersistedState['layers'];
  getVisualizationState(): T;
  getReferences(): SavedObjectReference[];
  getFilters(): Filter[];
  getDataView(): DataView;
}

export interface VisualizationAttributesBuilder {
  build(): LensAttributes;
}

export type Formula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];

export type VisualizationTypes = keyof typeof visualizationTypes;
export type HostsLensFormulas = keyof typeof hostLensFormulas;
export type HostsLensMetricChartFormulas = Exclude<HostsLensFormulas, 'diskIORead' | 'diskIOWrite'>;
export type HostsLensLineChartFormulas = Exclude<HostsLensFormulas, 'hostCount'>;
