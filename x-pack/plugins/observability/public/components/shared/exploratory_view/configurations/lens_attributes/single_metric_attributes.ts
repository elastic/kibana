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
import { ColumnFilter, MetricOption } from '../../types';
import { SeriesConfig } from '../../../../..';
import {
  buildNumberColumn,
  LayerConfig,
  LensAttributes,
  parseCustomFieldName,
} from '../lens_attributes';

export class SingleMetricLensAttributes extends LensAttributes {
  columnId: string;
  metricStateOptions?: MetricOption['metricStateOptions'];

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

    const {
      columnFilter,
      columnField,
      columnLabel,
      columnType,
      formula,
      metricStateOptions,
      format,
    } = parseCustomFieldName(seriesConfig, selectedMetricField);

    this.metricStateOptions = metricStateOptions;

    if (columnType === FORMULA_COLUMN && formula) {
      return this.getFormulaLayer({ formula, label: columnLabel, dataView: indexPattern, format });
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
    format,
  }: {
    formula: string;
    label?: string;
    format?: string;
    dataView: DataView;
  }) {
    const layer = this.lensFormulaHelper?.insertOrReplaceFormulaColumn(
      this.columnId,
      {
        formula,
        label,
        format:
          format === 'percent' || !format
            ? {
                id: 'percent',
                params: {
                  decimals: 1,
                },
              }
            : undefined,
      },
      { columns: {}, columnOrder: [] },
      dataView
    );

    return {
      layer0: layer!,
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
      ...(this.metricStateOptions ?? {}),
      size: 's',
    };
  }

  getJSON(refresh?: number): TypedLensByValueInput['attributes'] {
    const query = this.globalFilter || this.layerConfigs[0].seriesConfig.query;

    const visualization = this.getMetricState();

    return {
      title: 'Prefilled from exploratory view app',
      description: String(refresh),
      visualizationType: 'lnsLegacyMetric',
      references: this.getReferences(),
      state: {
        visualization,
        datasourceStates: {
          formBased: {
            layers: this.layers,
          },
        },
        query: query || { query: '', language: 'kuery' },
        filters: [],
      },
    };
  }
}
