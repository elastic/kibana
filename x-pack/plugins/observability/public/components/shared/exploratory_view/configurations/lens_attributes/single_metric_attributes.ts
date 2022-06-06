/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricState, TypedLensByValueInput } from '@kbn/lens-plugin/public';

import {
  buildNumberColumn,
  LayerConfig,
  LensAttributes,
  parseCustomFieldName,
} from '../lens_attributes';

export class SingleMetricLensAttributes extends LensAttributes {
  columnId: string;

  constructor(layerConfigs: LayerConfig[], reportType: string) {
    super(layerConfigs, reportType);
    this.layers = {};
    this.reportType = reportType;

    this.layerConfigs = layerConfigs;
    this.isMultiSeries = layerConfigs.length > 1;

    this.columnId = 'layer-0-column-1';

    this.globalFilter = this.getGlobalFilter(this.isMultiSeries);
    this.layers = this.getSingleMetricLayer();
  }

  getSingleMetricLayer() {
    const { seriesConfig, selectedMetricField, operationType } = this.layerConfigs[0];

    const { columnFilter, columnField, columnLabel } = parseCustomFieldName(
      seriesConfig,
      selectedMetricField
    );

    const getSourceField = () => {
      if (selectedMetricField.startsWith('Records') || selectedMetricField.startsWith('records')) {
        return 'Records';
      }
      return columnField || selectedMetricField;
    };

    const sourceField = getSourceField();

    const isPercentileColumn = operationType?.includes('th');

    if (isPercentileColumn) {
      return {
        layer0: {
          columns: {
            [this.columnId]: {
              ...this.getPercentileNumberColumn(sourceField, operationType!, seriesConfig),
              label: columnLabel ?? '',
              filter: columnFilter,
            },
          },
          columnOrder: [this.columnId],
          incompleteColumns: {},
        },
      };
    }

    return {
      layer0: {
        columns: {
          [this.columnId]: {
            ...buildNumberColumn(sourceField),
            label: columnLabel ?? '',
            operationType: sourceField === 'Records' ? 'count' : operationType || 'median',
            filter: columnFilter,
          },
        },
        columnOrder: [this.columnId],
        incompleteColumns: {},
      },
    };
  }

  getMetricState(): MetricState {
    return {
      accessor: this.columnId,
      layerId: 'layer0',
      layerType: 'data',
    };
  }

  getJSON(refresh?: number): TypedLensByValueInput['attributes'] {
    const query = this.globalFilter || this.layerConfigs[0].seriesConfig.query;

    const visualization = this.getMetricState();

    return {
      title: 'Prefilled from exploratory view app',
      description: String(refresh),
      visualizationType: 'lnsMetric',
      references: this.getReferences(),
      state: {
        visualization,
        datasourceStates: {
          indexpattern: {
            layers: this.layers,
          },
        },
        query: query || { query: '', language: 'kuery' },
        filters: [],
      },
    };
  }
}
