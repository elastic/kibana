/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormBasedPersistedState,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
  XYState,
  FormulaPublicApi,
  XYLayerConfig,
} from '@kbn/lens-plugin/public';
import { hostLensFormulas } from './constants';
export type LensAttributes = TypedLensByValueInput['attributes'];

// Attributes
export type LensVisualizationState = XYState | MetricVisualizationState;

export interface VisualizationAttributesBuilder {
  build(): LensAttributes;
}

// Column
export interface ChartColumn {
  getData(
    id: string,
    baseLayer: PersistedIndexPatternLayer,
    dataView: DataView
  ): PersistedIndexPatternLayer;
  getFormulaConfig(): FormulaConfig;
}

// Layer
export type LensLayerConfig = XYLayerConfig | MetricVisualizationState;

export interface ChartLayer<TLayerConfig extends LensLayerConfig> {
  getName(): string | undefined;
  getLayer(
    layerId: string,
    accessorId: string,
    dataView: DataView
  ): FormBasedPersistedState['layers'];
  getReference(layerId: string, dataView: DataView): SavedObjectReference[];
  getLayerConfig(layerId: string, acessorId: string): TLayerConfig;
}

// Chart
export interface Chart<TVisualizationState extends LensVisualizationState> {
  getTitle(): string;
  getVisualizationType(): string;
  getLayers(): FormBasedPersistedState['layers'];
  getVisualizationState(): TVisualizationState;
  getReferences(): SavedObjectReference[];
  getDataView(): DataView;
}
export interface ChartConfig<
  TLayer extends ChartLayer<LensLayerConfig> | Array<ChartLayer<LensLayerConfig>>
> {
  dataView: DataView;
  layers: TLayer;
  title?: string;
}

// Formula
type LensFormula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];
export type FormulaConfig = Omit<LensFormula, 'format' | 'formula'> & {
  color?: string;
  format: NonNullable<LensFormula['format']>;
  value: string;
};

export type HostsLensFormulas = keyof typeof hostLensFormulas;
export type HostsLensMetricChartFormulas = Exclude<HostsLensFormulas, 'diskIORead' | 'diskIOWrite'>;
export type HostsLensLineChartFormulas = Exclude<HostsLensFormulas, 'hostCount'>;
