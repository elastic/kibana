/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormulaPublicApi, HeatmapVisualizationState } from '@kbn/lens-plugin/public';

import { euiPaletteNegative } from '@elastic/eui';
import { ColorStop } from '@kbn/coloring';
import { LayerConfig } from '../lens_attributes';
import { SingleMetricLensAttributes } from './single_metric_attributes';

export class HeatMapLensAttributes extends SingleMetricLensAttributes {
  xColumnId: string;
  layerId: string;
  breakDownColumnId: string;

  constructor(
    layerConfigs: LayerConfig[],
    reportType: string,
    lensFormulaHelper: FormulaPublicApi
  ) {
    super(layerConfigs, reportType, lensFormulaHelper);

    this.xColumnId = 'layer-0-column-x-1';
    this.breakDownColumnId = 'layer-0-breakdown-column';
    this.layerId = 'layer0';
    const layer0 = this.getSingleMetricLayer()!;

    layer0.columns[this.xColumnId] = this.getDateHistogramColumn('@timestamp');

    let columnOrder = [this.xColumnId];
    const layerConfig = layerConfigs[0];

    if (layerConfig.breakdown) {
      columnOrder = [this.breakDownColumnId, ...columnOrder];
      layer0.columns[this.breakDownColumnId] = this.getBreakdownColumn({
        layerConfig,
        sourceField: layerConfig.breakdown,
        layerId: this.layerId,
        alphabeticOrder: true,
      });
    }

    layer0.columnOrder = [...columnOrder, ...layer0.columnOrder];

    this.layers = { layer0 };

    this.visualization = this.getHeatmapState();
  }

  getHeatmapState() {
    const negativePalette = euiPaletteNegative(5);
    const layerConfig = this.layerConfigs[0];

    return {
      shape: 'heatmap',
      layerId: this.layerId,
      layerType: 'data',
      legend: {
        isVisible: true,
        position: 'right',
        type: 'heatmap_legend',
      },
      gridConfig: {
        type: 'heatmap_grid',
        isCellLabelVisible: false,
        isYAxisLabelVisible: true,
        isXAxisLabelVisible: true,
        isYAxisTitleVisible: false,
        isXAxisTitleVisible: false,
        xTitle: '',
      },
      valueAccessor: this.columnId,
      xAccessor: this.xColumnId,
      yAccessor: layerConfig.breakdown ? this.breakDownColumnId : undefined,
      palette: {
        type: 'palette',
        name: 'negative',
        params: {
          name: 'negative',
          continuity: 'above',
          reverse: false,
          stops: negativePalette.map((nColor, ind) => ({
            color: nColor,
            stop: ind === 0 ? 1 : ind * 20,
          })) as ColorStop[],
          rangeMin: 0,
        },
        accessor: this.columnId,
      },
    } as HeatmapVisualizationState;
  }
}
