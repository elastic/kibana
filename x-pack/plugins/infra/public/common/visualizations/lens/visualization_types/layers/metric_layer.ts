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
import { Layer, MetricLayerSetting } from '../../../types';
import { getDefaultReferences, getHistogramColumn } from '../../utils';

const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export class MetricLayer implements Layer<MetricVisualizationState> {
  constructor(private setting: MetricLayerSetting) {}

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
        ...this.setting.data.getLayer(accessorId, dataView, {
          columnOrder: [],
          columns: {},
        }),
      },
      [`${layerId}_trendline`]: this.setting.data.getLayer(
        `${accessorId}_trendline`,
        dataView,
        baseLayer
      ),
    };
  }
  getReference(layerId: string, dataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(dataView, layerId);
  }

  getLayerConfig(layerId: string, acessorId: string): MetricVisualizationState {
    const { options } = this.setting;
    const { subtitle, backgroundColor, showTrendLine = true } = options ?? {};
    return {
      layerId,
      layerType: 'data',
      metricAccessor: acessorId,
      color: backgroundColor,
      subtitle,
      showBar: false,
      ...(showTrendLine
        ? {
            trendlineLayerId: `${layerId}_trendline`,
            trendlineLayerType: 'metricTrendline',
            trendlineMetricAccessor: `${acessorId}_trendline`,
            trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          }
        : {}),
    };
  }
  getName(): string {
    return this.setting.data.getName();
  }
}
