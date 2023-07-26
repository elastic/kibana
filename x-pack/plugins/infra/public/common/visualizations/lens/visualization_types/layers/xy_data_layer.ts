/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormulaPublicApi,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  XYDataLayerConfig,
  SeriesType,
} from '@kbn/lens-plugin/public';
import type { ChartColumn, ChartLayer, FormulaConfig } from '../../../types';
import { getDefaultReferences, getHistogramColumn, getTopValuesColumn } from '../../utils';
import { FormulaColumn } from './column/formula';

const BREAKDOWN_COLUMN_NAME = 'aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export interface XYLayerOptions {
  breakdown?: {
    size: number;
    sourceField: string;
  };
  seriesType?: SeriesType;
}

interface XYLayerConfig {
  data: FormulaConfig[];
  options?: XYLayerOptions;
  formulaAPI: FormulaPublicApi;
}

export class XYDataLayer implements ChartLayer<XYDataLayerConfig> {
  private column: ChartColumn[];
  constructor(private layerConfig: XYLayerConfig) {
    this.column = layerConfig.data.map((p) => new FormulaColumn(p, layerConfig.formulaAPI));
  }

  getName(): string | undefined {
    return this.column[0].getFormulaConfig().label;
  }

  getBaseColumnColumn(dataView: DataView, options?: XYLayerOptions) {
    return {
      ...getHistogramColumn({
        columnName: HISTOGRAM_COLUMN_NAME,
        overrides: {
          sourceField: dataView.timeFieldName,
        },
      }),
      ...(options?.breakdown
        ? {
            ...getTopValuesColumn({
              columnName: BREAKDOWN_COLUMN_NAME,
              overrides: {
                sourceField: options?.breakdown.sourceField,
                breakdownSize: options?.breakdown.size,
              },
            }),
          }
        : {}),
    };
  }

  getLayer(
    layerId: string,
    accessorId: string,
    dataView: DataView
  ): FormBasedPersistedState['layers'] {
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [BREAKDOWN_COLUMN_NAME, HISTOGRAM_COLUMN_NAME],
      columns: {
        ...this.getBaseColumnColumn(dataView, this.layerConfig.options),
      },
    };

    return {
      [layerId]: this.column.reduce(
        (acc, curr, index) => ({
          ...acc,
          ...curr.getData(`${accessorId}_${index}`, acc, dataView),
        }),
        baseLayer
      ),
    };
  }

  getReference(layerId: string, dataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(dataView, layerId);
  }

  getLayerConfig(layerId: string, accessorId: string): XYDataLayerConfig {
    return {
      layerId,
      seriesType: this.layerConfig.options?.seriesType ?? 'line',
      accessors: this.column.map((_, index) => `${accessorId}_${index}`),
      yConfig: [],
      layerType: 'data',
      xAccessor: HISTOGRAM_COLUMN_NAME,
      splitAccessor: this.layerConfig.options?.breakdown ? BREAKDOWN_COLUMN_NAME : undefined,
    };
  }
}
