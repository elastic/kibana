/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FormulaPublicApi,
  MetricState,
  OperationType,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';

import type { DataView } from '@kbn/data-views-plugin/common';

import { FORMULA_COLUMN } from '../constants';
import { ColumnFilter } from '../../types';
import { SeriesConfig } from '../../../../..';
import {
  buildNumberColumn,
  LayerConfig,
  LensAttributes,
  parseCustomFieldName,
} from '../lens_attributes';

export class SingleMetricLensAttributes extends LensAttributes {
  columnId: string;

  constructor(
    layerConfigs: LayerConfig[],
    reportType: string,
    lensFormulaHelper: FormulaPublicApi
  ) {
    super(layerConfigs, reportType, lensFormulaHelper);
    this.layers = {};
    this.reportType = reportType;

    this.layerConfigs = layerConfigs;
    this.isMultiSeries = layerConfigs.length > 1;

    this.columnId = 'layer-0-column-1';

    this.globalFilter = this.getGlobalFilter(this.isMultiSeries);
    this.layers = this.getSingleMetricLayer();
  }

  getSingleMetricLayer() {
    const { seriesConfig, selectedMetricField, operationType, indexPattern } = this.layerConfigs[0];

    const { columnFilter, columnField, columnLabel, columnType, formula } = parseCustomFieldName(
      seriesConfig,
      selectedMetricField
    );

    if (columnType === FORMULA_COLUMN && formula) {
      return this.getFormulaLayer({ formula, label: columnLabel, dataView: indexPattern });
    }

    const getSourceField = () => {
      if (selectedMetricField.startsWith('Records') || selectedMetricField.startsWith('records')) {
        return 'Records';
      }
      return columnField || selectedMetricField;
    };

    const sourceField = getSourceField();

    const isPercentileColumn = operationType?.includes('th');

    if (isPercentileColumn) {
      return this.getPercentileLayer({
        sourceField,
        operationType,
        seriesConfig,
        columnLabel,
        columnFilter,
      });
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

  getFormulaLayer({
    formula,
    label,
    dataView,
  }: {
    formula: string;
    label?: string;
    dataView: DataView;
  }) {
    const layer = this.lensFormulaHelper?.insertOrReplaceFormulaColumn(
      this.columnId,
      {
        formula,
        label,
        format: {
          id: 'percent',
          params: {
            decimals: 2,
          },
        },
      },
      { columns: {}, columnOrder: [] },
      dataView
    );

    return {
      layer0: layer,
    };
  }

  getPercentileLayer({
    sourceField,
    operationType,
    seriesConfig,
    columnLabel,
    columnFilter,
  }: {
    sourceField: string;
    operationType?: OperationType;
    seriesConfig: SeriesConfig;
    columnLabel?: string;
    columnFilter?: ColumnFilter;
  }) {
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

  getMetricState(): MetricState {
    return {
      accessor: this.columnId,
      layerId: 'layer0',
      layerType: 'data',
      colorMode: 'Labels',
      palette: {
        name: 'custom',
        type: 'palette',
        params: {
          steps: 3,
          name: 'custom',
          reverse: false,
          rangeType: 'number',
          rangeMin: 0.8,
          rangeMax: 1,
          progression: 'fixed',
          stops: [
            { color: '#cc5642', stop: 0.9 },
            { color: '#d6bf57', stop: 0.95 },
            { color: '#209280', stop: 1.9903347477604902 },
          ],
          colorStops: [
            { color: '#cc5642', stop: 0.8 },
            { color: '#d6bf57', stop: 0.9 },
            { color: '#209280', stop: 0.95 },
          ],
          continuity: 'above',
          maxSteps: 5,
        },
      },
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

const examples = {
  type: 'lens',
  id: '6404bdc0-f323-11ec-9d40-b32dc04774a8',
  namespaces: ['default'],
  attributes: {
    title: 'Prefilled from exploratory view app',
    description: '1656009072383',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        accessor: 'layer-0-column-1',
        layerId: 'layer0',
        layerType: 'data',
        colorMode: 'Labels',
        palette: {
          name: 'custom',
          type: 'palette',
          params: {
            steps: 3,
            name: 'custom',
            reverse: false,
            rangeType: 'number',
            rangeMin: 0.8,
            rangeMax: null,
            progression: 'fixed',
            stops: [
              { color: '#cc5642', stop: 0.9 },
              { color: '#d6bf57', stop: 0.95 },
              { color: '#209280', stop: 1.9903347477604902 },
            ],
            colorStops: [
              { color: '#cc5642', stop: 0.8 },
              { color: '#d6bf57', stop: 0.9 },
              { color: '#209280', stop: 0.95 },
            ],
            continuity: 'above',
            maxSteps: 5,
          },
        },
      },
      query: { query: 'monitor.name: "Kibana_Health" and summary.up : *', language: 'kuery' },
      filters: [],
    },
  },
};
