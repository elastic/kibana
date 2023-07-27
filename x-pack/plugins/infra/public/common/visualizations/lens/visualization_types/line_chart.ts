/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormBasedPersistedState,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  XYState,
} from '@kbn/lens-plugin/public';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import {
  DEFAULT_LAYER_ID,
  getBreakdownColumn,
  getDefaultReferences,
  getHistogramColumn,
} from '../utils';
import type { LensChartConfig, VisualizationAttributes, LineChartOptions } from '../../types';

const BREAKDOWN_COLUMN_NAME = 'hosts_aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const ACCESSOR = 'formula_accessor';

export class LineChart implements VisualizationAttributes<XYState> {
  constructor(
    private chartConfig: LensChartConfig,
    private dataView: DataView,
    private formulaAPI: FormulaPublicApi,
    private options?: LineChartOptions
  ) {}

  getVisualizationType(): string {
    return 'lnsXY';
  }

  getLayers(): FormBasedPersistedState['layers'] {
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [BREAKDOWN_COLUMN_NAME, HISTOGRAM_COLUMN_NAME],
      columns: {
        ...getBreakdownColumn({
          columnName: BREAKDOWN_COLUMN_NAME,
          overrides: {
            sourceField: 'host.name',
            breakdownSize: this.options?.breakdownSize,
          },
        }),
        ...getHistogramColumn({
          columnName: HISTOGRAM_COLUMN_NAME,
          overrides: {
            sourceField: this.dataView.timeFieldName,
          },
        }),
      },
    };

    const dataLayer = this.formulaAPI.insertOrReplaceFormulaColumn(
      ACCESSOR,
      this.chartConfig.formula,
      baseLayer,
      this.dataView
    );

    if (!dataLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return { [DEFAULT_LAYER_ID]: dataLayer, ...this.chartConfig.lineChartConfig?.extraLayers };
  }

  getVisualizationState(): XYState {
    const extraVisualizationState = this.chartConfig.lineChartConfig?.extraVisualizationState;

    return getXYVisualizationState({
      ...extraVisualizationState,
      layers: [
        {
          layerId: DEFAULT_LAYER_ID,
          seriesType: 'line',
          accessors: [ACCESSOR],
          yConfig: [],
          layerType: 'data',
          xAccessor: HISTOGRAM_COLUMN_NAME,
          splitAccessor: BREAKDOWN_COLUMN_NAME,
        },
        ...(extraVisualizationState?.layers ? extraVisualizationState?.layers : []),
      ],
    });
  }

  getReferences(): SavedObjectReference[] {
    const extraReference = this.chartConfig.lineChartConfig?.extraReference;
    return [
      ...getDefaultReferences(this.dataView, DEFAULT_LAYER_ID),
      ...(extraReference ? getDefaultReferences(this.dataView, extraReference) : []),
    ];
  }

  getDataView(): DataView {
    return this.dataView;
  }

  getTitle(): string {
    return this.options?.title ?? this.chartConfig.title ?? '';
  }

  getFilters(): Filter[] {
    return this.chartConfig.getFilters({ id: this.dataView.id ?? DEFAULT_LAYER_ID });
  }
}

export const getXYVisualizationState = (
  custom: Omit<Partial<XYState>, 'layers'> & { layers: XYState['layers'] }
): XYState => ({
  legend: {
    isVisible: false,
    position: 'right',
    showSingleSeries: false,
  },
  valueLabels: 'show',
  fittingFunction: 'Zero',
  curveType: 'LINEAR',
  yLeftScale: 'linear',
  axisTitlesVisibilitySettings: {
    x: false,
    yLeft: false,
    yRight: true,
  },
  tickLabelsVisibilitySettings: {
    x: true,
    yLeft: true,
    yRight: true,
  },
  labelsOrientation: {
    x: 0,
    yLeft: 0,
    yRight: 0,
  },
  gridlinesVisibilitySettings: {
    x: true,
    yLeft: true,
    yRight: true,
  },
  preferredSeriesType: 'line',
  valuesInLegend: false,
  emphasizeFitting: true,
  hideEndzones: true,
  ...custom,
});
