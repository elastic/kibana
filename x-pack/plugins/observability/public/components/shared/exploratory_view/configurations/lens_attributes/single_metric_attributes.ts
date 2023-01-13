/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormulaPublicApi, MetricState, OperationType } from '@kbn/lens-plugin/public';

import type { DataView } from '@kbn/data-views-plugin/common';

import { Query } from '@kbn/es-query';
import { getColorPalette } from '../synthetics/single_metric_config';
import { FORMULA_COLUMN, RECORDS_FIELD } from '../constants';
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
    const layer0 = this.getSingleMetricLayer()!;

    this.layers = {
      layer0,
    };
    this.visualization = this.getMetricState();
  }

  getSingleMetricLayer() {
    const { seriesConfig, selectedMetricField, operationType, dataView, name } =
      this.layerConfigs[0];

    const metricOption = parseCustomFieldName(seriesConfig, selectedMetricField);

    if (!Array.isArray(metricOption)) {
      const {
        columnFilter,
        columnField,
        columnLabel,
        columnType,
        formula,
        metricStateOptions,
        format,
        emptyAsNull = true,
      } = metricOption;

      this.metricStateOptions = metricStateOptions;

      if (columnType === FORMULA_COLUMN && formula) {
        return this.getFormulaLayer({
          formula,
          label: name ?? columnLabel,
          dataView,
          format,
          filter: columnFilter,
        });
      }

      const getSourceField = () => {
        if (
          selectedMetricField.startsWith('Records') ||
          selectedMetricField.startsWith('records')
        ) {
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
        columns: {
          [this.columnId]: {
            ...buildNumberColumn(sourceField),
            label: name ?? columnLabel,
            operationType: sourceField === RECORDS_FIELD ? 'count' : operationType || 'median',
            filter: columnFilter,
            params: {
              emptyAsNull,
            },
          },
        },
        columnOrder: [this.columnId],
        incompleteColumns: {},
      };
    }
  }

  getFormulaLayer({
    formula,
    label,
    dataView,
    format,
    filter,
  }: {
    formula: string;
    label?: string;
    format?: string;
    filter?: Query;
    dataView: DataView;
  }) {
    const layer = this.lensFormulaHelper?.insertOrReplaceFormulaColumn(
      this.columnId,
      {
        formula,
        label,
        filter,
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

    return layer!;
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
      columns: {
        [this.columnId]: {
          ...this.getPercentileNumberColumn(sourceField, operationType!, seriesConfig),
          label: columnLabel ?? '',
          filter: columnFilter,
        },
      },
      columnOrder: [this.columnId],
      incompleteColumns: {},
    };
  }

  getMetricState(): MetricState {
    const { color } = this.layerConfigs[0];

    console.log(this.layerConfigs[0]);

    const metricStateOptions: MetricOption['metricStateOptions'] = {
      ...(this.metricStateOptions ?? {}),
      ...(color ? { colorMode: 'Labels', palette: getColorPalette(color) } : {}),
    };

    return {
      accessor: this.columnId,
      layerId: 'layer0',
      layerType: 'data',
      ...metricStateOptions,
      size: 's',
    };
  }
}
