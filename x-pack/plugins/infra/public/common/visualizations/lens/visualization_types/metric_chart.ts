/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FormBasedPersistedState,
  FormulaPublicApi,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import { DEFAULT_LAYER_ID, getDefaultReferences, getHistogramColumn } from '../utils';

import type {
  VisualizationAttributes,
  LensChartConfig,
  MetricChartOptions,
  Formula,
} from '../../types';

const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = 'trendline_layer';
const TRENDLINE_ACCESSOR = 'metric_trendline_formula_accessor';
const ACCESSOR = 'metric_formula_accessor';

export class MetricChart implements VisualizationAttributes<MetricVisualizationState> {
  constructor(
    private chartConfig: LensChartConfig,
    private dataView: DataView,
    private formulaAPI: FormulaPublicApi,
    private options?: MetricChartOptions
  ) {}

  getVisualizationType(): string {
    return 'lnsMetric';
  }

  getTrendLineLayer(baseLayer: PersistedIndexPatternLayer): FormBasedPersistedState['layers'] {
    const trendLineLayer = this.formulaAPI.insertOrReplaceFormulaColumn(
      TRENDLINE_ACCESSOR,
      this.getFormulaWithOverride(),
      baseLayer,
      this.dataView
    );

    if (!trendLineLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return {
      [TRENDLINE_LAYER_ID]: {
        linkToLayers: [DEFAULT_LAYER_ID],
        ...trendLineLayer,
      },
    };
  }

  getFormulaWithOverride(): Formula {
    const { formula } = this.chartConfig;
    const { decimals = formula.format?.params?.decimals, title = this.chartConfig.title } =
      this.options ?? {};
    return {
      ...this.chartConfig.formula,
      ...(formula.format && decimals
        ? {
            format: {
              ...formula.format,
              params: {
                decimals,
              },
            },
          }
        : {}),
      label: title,
    };
  }

  getLayers(): FormBasedPersistedState['layers'] {
    const { showTrendLine = true } = this.options ?? {};
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [HISTOGRAM_COLUMN_NAME],
      columns: getHistogramColumn({
        columnName: HISTOGRAM_COLUMN_NAME,
        overrides: {
          sourceField: this.dataView.timeFieldName,
          params: {
            interval: 'auto',
            includeEmptyRows: true,
          },
        },
      }),
      sampling: 1,
    };

    const baseLayerDetails = this.formulaAPI.insertOrReplaceFormulaColumn(
      ACCESSOR,
      this.getFormulaWithOverride(),
      { columnOrder: [], columns: {} },
      this.dataView
    );

    if (!baseLayerDetails) {
      throw new Error('Error generating the data layer for the chart');
    }

    return {
      [DEFAULT_LAYER_ID]: baseLayerDetails,
      ...(showTrendLine ? this.getTrendLineLayer(baseLayer) : {}),
    };
  }

  getVisualizationState(): MetricVisualizationState {
    const { subtitle, backgroundColor, showTrendLine = true } = this.options ?? {};
    return {
      layerId: DEFAULT_LAYER_ID,
      layerType: 'data',
      metricAccessor: ACCESSOR,
      color: backgroundColor,
      subtitle,
      showBar: false,
      ...(showTrendLine
        ? {
            trendlineLayerId: TRENDLINE_LAYER_ID,
            trendlineLayerType: 'metricTrendline',
            trendlineMetricAccessor: TRENDLINE_ACCESSOR,
            trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          }
        : {}),
    };
  }

  getReferences(): SavedObjectReference[] {
    const { showTrendLine = true } = this.options ?? {};
    return [
      ...getDefaultReferences(this.dataView, DEFAULT_LAYER_ID),
      ...(showTrendLine ? getDefaultReferences(this.dataView, TRENDLINE_LAYER_ID) : []),
    ];
  }

  getDataView(): DataView {
    return this.dataView;
  }

  getTitle(): string {
    return this.options?.showTitle ? this.options?.title ?? this.chartConfig.title : '';
  }

  getFilters(): Filter[] {
    return this.chartConfig.getFilters({ id: this.dataView.id ?? DEFAULT_LAYER_ID });
  }
}
