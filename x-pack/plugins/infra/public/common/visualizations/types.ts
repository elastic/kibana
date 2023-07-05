/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
  XYState,
  OperationMetadata,
  XYLayerConfig,
} from '@kbn/lens-plugin/public';

import { hostLensFormulas, visualizationTypes } from './constants';

export type LensAttributes = TypedLensByValueInput['attributes'];

// Options

export interface ValueParameters {
  label?: string;
  format?: {
    decimals?: number;
  };
}
export interface Options {
  title: string;
}
export interface XYLayerOptions extends Options {
  breakdown?: {
    size: number;
    sourceField: string;
  };
}

export interface MetricLayerOptions extends Options {
  backgroundColor?: string;
  showTitle?: boolean;
  showTrendLine?: boolean;
  subtitle?: string;
}

// Config
// export interface ReferenceLineConfig {
//   extraVisualizationState?: Partial<XYState>;
//   extraLayers?: FormBasedPersistedState['layers'];
//   extraReference?: string;
// }

// Attributes
export type LensVisualizationState = XYState | MetricVisualizationState;
export interface Chart<TVisualizationState extends LensVisualizationState> {
  getTitle(): string;
  getVisualizationType(): string;
  getLayers(): FormBasedPersistedState['layers'];
  getVisualizationState(): TVisualizationState;
  getReferences(): SavedObjectReference[];
  getFilters(): Filter[];
  getDataView(): DataView;
}

export interface VisualizationAttributesBuilder {
  build(): LensAttributes;
}

// Formula Layer

export interface DateHistogram {
  timeFieldName: string;
}

export interface TopValue {
  sourceField: string;
  breakdownSize: number;
}

export type BreakdownType = TopValue | DateHistogram;

export interface LayerSettingsBase<TOption extends Options> {
  options?: TOption;
}
export interface XYLayerSetting extends LayerSettingsBase<XYLayerOptions> {
  data: ChartData[];
}

export interface MetricLayerSetting extends LayerSettingsBase<MetricLayerOptions> {
  data: ChartData;
}

// export interface Layer {}

export type LensLayerConfig = XYLayerConfig | MetricVisualizationState;

export interface Layer<TLayerConfig extends LensLayerConfig> {
  getName(): string;
  getLayer(
    layerId: string,
    accessorId: string,
    dataView: DataView
  ): FormBasedPersistedState['layers'];
  getReference(layerId: string, dataView: DataView): SavedObjectReference[];
  getLayerConfig(layerId: string, acessorId: string): TLayerConfig;
}

export interface ChartConfig<TOptions extends Options> {
  dataView: DataView;
  options?: TOptions;
}

export interface XYChartConfig extends ChartConfig<XYLayerOptions> {
  layers: Array<Layer<XYLayerConfig>>;
}

export interface MetricChartConfig extends ChartConfig<MetricLayerOptions> {
  layers: Layer<XYLayerConfig>;
}

// value

export interface ChartData {
  getName(): string;
  getLayer(
    id: string,
    dataView: DataView,
    baseLayer: PersistedIndexPatternLayer
  ): PersistedIndexPatternLayer;
}

export type Formula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];

export interface LayerValueBase {
  value: number | string;
  format: Formula['format'];
}
export interface StaticValue extends LayerValueBase {
  value: number;
  scale: OperationMetadata['scale'];
}

export interface FormulaValue extends LayerValueBase {
  value: string;
}

export interface LayerValue<TData extends LayerValueBase> {
  name: string;
  data: TData;
}

export interface LensChartConfig {
  title: string;
  formula: Formula;
  lineChartConfig: {
    extraVisualizationState?: Partial<XYState>;
    extraLayers?: FormBasedPersistedState['layers'];
    extraReference?: string;
  };
}

//

export type VisualizationTypes = keyof typeof visualizationTypes;
export type HostsLensFormulas = keyof typeof hostLensFormulas;
export type HostsLensMetricChartFormulas = Exclude<HostsLensFormulas, 'diskIORead' | 'diskIOWrite'>;
export type HostsLensLineChartFormulas = Exclude<HostsLensFormulas, 'hostCount'>;
