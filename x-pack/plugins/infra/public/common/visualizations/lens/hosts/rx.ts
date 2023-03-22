/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormBasedLayer,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  XYState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  DEFAULT_LAYER_ID,
  getAdhocDataView,
  getBreakdownColumn,
  getDefaultReferences,
  getHistogramColumn,
  getXYVisualizationState,
} from '../utils';
import type { LensOptions } from '../../../../types';
import type { ILensVisualization } from '../types';

const BREAKDOWN_COLUMN_NAME = 'hosts_aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export class RX implements ILensVisualization {
  constructor(
    private dataView: DataView,
    private options: LensOptions,
    private formula: FormulaPublicApi
  ) {}

  getTitle(): string {
    return 'Network Inbound (RX)';
  }

  getVisualizationType(): string {
    return 'lnsXY';
  }

  getLayers = (): Record<string, Omit<FormBasedLayer, 'indexPatternId'>> => {
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [BREAKDOWN_COLUMN_NAME, HISTOGRAM_COLUMN_NAME],
      columns: {
        ...getBreakdownColumn(BREAKDOWN_COLUMN_NAME, 'host.name', this.options.breakdownSize),
        ...getHistogramColumn(HISTOGRAM_COLUMN_NAME, this.dataView.timeFieldName ?? '@timestamp'),
      },
    };

    const dataLayer = this.formula.insertOrReplaceFormulaColumn(
      'y_network_in_bytes',
      {
        formula:
          "average(host.network.ingress.bytes) * 8 / (max(metricset.period, kql='host.network.ingress.bytes: *') / 1000)",
        format: {
          id: 'bits',
          params: {
            decimals: 1,
          },
        },
      },
      baseLayer,
      this.dataView
    );

    if (!dataLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return { [DEFAULT_LAYER_ID]: dataLayer };
  };
  getVisualizationState = (): XYState => {
    return getXYVisualizationState({
      layers: [
        {
          layerId: DEFAULT_LAYER_ID,
          seriesType: 'line',
          accessors: ['y_network_in_bytes'],
          yConfig: [],
          layerType: 'data',
          xAccessor: HISTOGRAM_COLUMN_NAME,
          splitAccessor: BREAKDOWN_COLUMN_NAME,
        },
      ],
    });
  };
  getReferences = () => getDefaultReferences(this.dataView, DEFAULT_LAYER_ID);
  getAdhocDataView = () => getAdhocDataView(this.dataView);
}
