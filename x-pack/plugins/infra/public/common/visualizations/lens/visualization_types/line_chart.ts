/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedPersistedState, XYState } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_AD_HOC_DATA_VIEW_ID, DEFAULT_LAYER_ID } from '../utils';
import type { Chart, XYChartConfig } from '../../types';
import { getFilters } from '../formulas/host/utils';

const ACCESSOR = 'formula_accessor';

export class LineChart implements Chart<XYState> {
  constructor(private state: XYChartConfig) {}

  getVisualizationType(): string {
    return 'lnsXY';
  }

  getLayers(): FormBasedPersistedState['layers'] {
    return this.state.layers.reduce((acc, curr, index) => {
      const layerId = `${DEFAULT_LAYER_ID}_${index}`;
      const accessorId = `${ACCESSOR}_${index}`;
      return {
        ...acc,
        ...curr.getLayer(layerId, accessorId, this.state.dataView),
      };
    }, {});
  }

  getVisualizationState(): XYState {
    return getXYVisualizationState({
      layers: [
        ...this.state.layers.map((p, index) => {
          const layerId = `${DEFAULT_LAYER_ID}_${index}`;
          const accessorId = `${ACCESSOR}_${index}`;
          return p.getLayerConfig(layerId, accessorId);
        }),
      ],
    });
  }

  getReferences(): SavedObjectReference[] {
    return this.state.layers.flatMap((p, index) => {
      const layerId = `${DEFAULT_LAYER_ID}_${index}`;
      return p.getReference(layerId, this.state.dataView);
    });
  }

  getDataView(): DataView {
    return this.state.dataView;
  }

  getTitle(): string {
    return this.state.options?.title ?? this.state.layers[0].getName();
  }

  getFilters(): Filter[] {
    return getFilters({
      id: this.state.dataView.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID,
    });
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
