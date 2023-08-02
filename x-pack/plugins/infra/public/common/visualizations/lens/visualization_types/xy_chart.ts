/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedPersistedState, XYLayerConfig, XYState } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core/server';
import { DEFAULT_LAYER_ID } from '../utils';
import type { Chart, ChartConfig, ChartLayer } from '../../types';

const ACCESSOR = 'formula_accessor';

export class XYChart implements Chart<XYState> {
  constructor(private chartConfig: ChartConfig<Array<ChartLayer<XYLayerConfig>>>) {}

  getVisualizationType(): string {
    return 'lnsXY';
  }

  getLayers(): FormBasedPersistedState['layers'] {
    return this.chartConfig.layers.reduce((acc, curr, index) => {
      const layerId = `${DEFAULT_LAYER_ID}_${index}`;
      const accessorId = `${ACCESSOR}_${index}`;
      return {
        ...acc,
        ...curr.getLayer(layerId, accessorId, this.chartConfig.dataView),
      };
    }, {});
  }

  getVisualizationState(): XYState {
    return getXYVisualizationState({
      layers: [
        ...this.chartConfig.layers.map((layerItem, index) => {
          const layerId = `${DEFAULT_LAYER_ID}_${index}`;
          const accessorId = `${ACCESSOR}_${index}`;
          return layerItem.getLayerConfig(layerId, accessorId);
        }),
      ],
    });
  }

  getReferences(): SavedObjectReference[] {
    return this.chartConfig.layers.flatMap((p, index) => {
      const layerId = `${DEFAULT_LAYER_ID}_${index}`;
      return p.getReference(layerId, this.chartConfig.dataView);
    });
  }

  getDataView(): DataView {
    return this.chartConfig.dataView;
  }

  getTitle(): string {
    return this.chartConfig.title ?? this.chartConfig.layers[0].getName() ?? '';
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
