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
  PersistedIndexPatternLayer,
  XYDataLayerConfig,
} from '@kbn/lens-plugin/public';
import { XYLayerSetting, Layer, XYLayerOptions } from '../../../types';
import { getDefaultReferences, getHistogramColumn, getTopValuesColumn } from '../../utils';

const BREAKDOWN_COLUMN_NAME = 'hosts_aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export class XYLayer implements Layer<XYDataLayerConfig> {
  constructor(private setting: XYLayerSetting) {}

  getName(): string {
    return this.setting.data[0].getName();
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
        ...this.getBaseColumnColumn(dataView, this.setting.options),
      },
    };

    return {
      [layerId]: this.setting.data.reduce(
        (acc, curr, index) => ({
          ...acc,
          ...curr.getLayer(`${accessorId}_${index}`, dataView, baseLayer),
        }),
        {} as PersistedIndexPatternLayer
      ),
    };
  }

  getReference(layerId: string, dataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(dataView, layerId);
  }

  getLayerConfig(layerId: string, acessorId: string): XYDataLayerConfig {
    return {
      layerId,
      seriesType: 'line',
      accessors: [acessorId],
      yConfig: [],
      layerType: 'data',
      xAccessor: HISTOGRAM_COLUMN_NAME,
      splitAccessor: BREAKDOWN_COLUMN_NAME,
    };
  }
}
