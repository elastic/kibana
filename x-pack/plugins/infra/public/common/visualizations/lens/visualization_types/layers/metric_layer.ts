/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  FormBasedPersistedState,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import { ChartLayer } from '../../../types';
import { getDefaultReferences, getHistogramColumn } from '../../utils';
import { FormulaColumn } from './column/formula';

const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export interface MetricLayerOptions {
  backgroundColor?: string;
  showTitle?: boolean;
  showTrendLine?: boolean;
  subtitle?: string;
}

interface MetricLayerConfig {
  column: FormulaColumn;
  options?: MetricLayerOptions;
}

export class MetricLayer implements ChartLayer<MetricVisualizationState> {
  constructor(private layerConfig: MetricLayerConfig) {}

  getLayer(
    layerId: string,
    accessorId: string,
    dataView: DataView
  ): FormBasedPersistedState['layers'] {
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [HISTOGRAM_COLUMN_NAME],
      columns: getHistogramColumn({
        columnName: HISTOGRAM_COLUMN_NAME,
        overrides: {
          sourceField: dataView.timeFieldName,
          params: {
            interval: 'auto',
            includeEmptyRows: true,
          },
        },
      }),
      sampling: 1,
    };

    return {
      [layerId]: {
        ...this.layerConfig.column.getData(accessorId, dataView, {
          columnOrder: [],
          columns: {},
        }),
      },
      [`${layerId}_trendline`]: {
        linkToLayers: [layerId],
        ...this.layerConfig.column.getData(`${accessorId}_trendline`, dataView, baseLayer),
      },
    };
  }
  getReference(layerId: string, dataView: DataView): SavedObjectReference[] {
    return [
      ...getDefaultReferences(dataView, layerId),
      ...getDefaultReferences(dataView, `${layerId}_trendline`),
    ];
  }

  getLayerConfig(layerId: string, accessorId: string): MetricVisualizationState {
    const { subtitle, backgroundColor, showTrendLine = true } = this.layerConfig.options ?? {};

    return {
      layerId,
      layerType: 'data',
      metricAccessor: accessorId,
      color: backgroundColor,
      subtitle,
      showBar: false,
      ...(showTrendLine
        ? {
            trendlineLayerId: `${layerId}_trendline`,
            trendlineLayerType: 'metricTrendline',
            trendlineMetricAccessor: `${accessorId}_trendline`,
            trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          }
        : {}),
    };
  }
  getName(): string {
    return this.layerConfig.column.getName();
  }
}
