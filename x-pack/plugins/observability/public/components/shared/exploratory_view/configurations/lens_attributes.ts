/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  AvgIndexPatternColumn,
  MedianIndexPatternColumn,
  PercentileIndexPatternColumn,
  OperationType,
  PersistedIndexPatternLayer,
  RangeIndexPatternColumn,
  SeriesType,
  TypedLensByValueInput,
  XYState,
  XYCurveType,
  DataType,
  OperationMetadata,
  FieldBasedIndexPatternColumn,
} from '../../../../../../lens/public';
import {
  buildPhraseFilter,
  buildPhrasesFilter,
  IndexPattern,
} from '../../../../../../../../src/plugins/data/common';
import { FieldLabels } from './constants';
import { DataSeries, UrlFilter } from '../types';

function getLayerReferenceName(layerId: string) {
  return `indexpattern-datasource-layer-${layerId}`;
}

function buildNumberColumn(sourceField: string) {
  return {
    sourceField,
    dataType: 'number' as DataType,
    isBucketed: false,
    scale: 'ratio' as OperationMetadata['scale'],
  };
}

export class LensAttributes {
  indexPattern: IndexPattern;
  layers: Record<string, PersistedIndexPatternLayer>;
  visualization: XYState;
  filters: UrlFilter[];
  seriesType: SeriesType;
  reportViewConfig: DataSeries;
  reportDefinitions: Record<string, string>;

  constructor(
    indexPattern: IndexPattern,
    reportViewConfig: DataSeries,
    seriesType?: SeriesType,
    filters?: UrlFilter[],
    operationType?: OperationType,
    reportDefinitions?: Record<string, string>
  ) {
    this.indexPattern = indexPattern;
    this.layers = {};
    this.filters = filters ?? [];
    this.reportDefinitions = reportDefinitions ?? {};

    if (typeof reportViewConfig.yAxisColumn.operationType !== undefined && operationType) {
      reportViewConfig.yAxisColumn.operationType = operationType as FieldBasedIndexPatternColumn['operationType'];
    }
    this.seriesType = seriesType ?? reportViewConfig.defaultSeriesType;
    this.reportViewConfig = reportViewConfig;
    this.layers.layer1 = this.getLayer();
    this.visualization = this.getXyState();
  }

  addBreakdown(sourceField: string) {
    const fieldMeta = this.indexPattern.getFieldByName(sourceField);

    this.layers.layer1.columns['break-down-column'] = {
      sourceField,
      label: `Top values of ${FieldLabels[sourceField]}`,
      dataType: fieldMeta?.type as DataType,
      operationType: 'terms',
      scale: 'ordinal',
      isBucketed: true,
      params: {
        size: 3,
        orderBy: { type: 'column', columnId: 'y-axis-column' },
        orderDirection: 'desc',
        otherBucket: true,
        missingBucket: false,
      },
    };

    this.layers.layer1.columnOrder = ['x-axis-column', 'break-down-column', 'y-axis-column'];

    this.visualization.layers[0].splitAccessor = 'break-down-column';
  }

  removeBreakdown() {
    delete this.layers.layer1.columns['break-down-column'];

    this.layers.layer1.columnOrder = ['x-axis-column', 'y-axis-column'];

    this.visualization.layers[0].splitAccessor = undefined;
  }

  getNumberRangeColumn(sourceField: string): RangeIndexPatternColumn {
    return {
      sourceField,
      label: this.reportViewConfig.labels[sourceField],
      dataType: 'number',
      operationType: 'range',
      isBucketed: true,
      scale: 'interval',
      params: {
        type: 'histogram',
        ranges: [{ from: 0, to: 1000, label: '' }],
        maxBars: 'auto',
      },
    };
  }

  getNumberOperationColumn(
    sourceField: string,
    operationType: 'average' | 'median'
  ): AvgIndexPatternColumn | MedianIndexPatternColumn {
    return {
      ...buildNumberColumn(sourceField),
      label: i18n.translate('xpack.observability.expView.columns.label', {
        defaultMessage: '{operationType} of {sourceField}',
        values: { sourceField, operationType },
      }),
      operationType,
    };
  }

  getPercentileNumberColumn(
    sourceField: string,
    percentileValue: string
  ): PercentileIndexPatternColumn {
    return {
      ...buildNumberColumn(sourceField),
      label: i18n.translate('xpack.observability.expView.columns.label', {
        defaultMessage: '{percentileValue} percentile of {sourceField}',
        values: { sourceField, percentileValue },
      }),
      operationType: 'percentile',
      params: { percentile: Number(percentileValue.split('th')[0]) },
    };
  }

  getDateHistogramColumn(sourceField: string): DateHistogramIndexPatternColumn {
    return {
      sourceField,
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
    };
  }

  getXAxis() {
    const { xAxisColumn } = this.reportViewConfig;

    return this.getColumnBasedOnType(xAxisColumn.sourceField!);
  }

  getColumnBasedOnType(sourceField: string, operationType?: OperationType) {
    const { fieldMeta, columnType, fieldName } = this.getFieldMeta(sourceField);
    const { type: fieldType } = fieldMeta ?? {};

    if (fieldName === 'Records') {
      return this.getRecordsColumn();
    }

    if (fieldType === 'date') {
      return this.getDateHistogramColumn(fieldName);
    }
    if (fieldType === 'number') {
      if (columnType === 'operation' || operationType) {
        if (operationType === 'median' || operationType === 'average') {
          return this.getNumberOperationColumn(fieldName, operationType);
        }
        if (operationType?.includes('th')) {
          return this.getPercentileNumberColumn(sourceField, operationType);
        }
      }
      return this.getNumberRangeColumn(fieldName);
    }

    // FIXME review my approach again
    return this.getDateHistogramColumn(fieldName);
  }

  getCustomFieldName(sourceField: string) {
    let fieldName = sourceField;
    let columnType = null;

    const rdf = this.reportViewConfig.reportDefinitions ?? [];

    const customField = rdf.find(({ field }) => field === fieldName);

    if (customField) {
      if (this.reportDefinitions[fieldName]) {
        fieldName = this.reportDefinitions[fieldName];
        if (customField?.options)
          columnType = customField?.options?.find(({ field }) => field === fieldName)?.columnType;
      } else if (customField.defaultValue) {
        fieldName = customField.defaultValue;
      } else if (customField.options?.[0].field) {
        fieldName = customField.options?.[0].field;
        columnType = customField.options?.[0].columnType;
      }
    }

    return { fieldName, columnType };
  }

  getFieldMeta(sourceField: string) {
    const { fieldName, columnType } = this.getCustomFieldName(sourceField);

    const fieldMeta = this.indexPattern.getFieldByName(fieldName);

    return { fieldMeta, fieldName, columnType };
  }

  getMainYAxis() {
    const { sourceField, operationType } = this.reportViewConfig.yAxisColumn;

    if (sourceField === 'Records' || !sourceField) {
      return this.getRecordsColumn();
    }

    return this.getColumnBasedOnType(sourceField!, operationType);
  }

  getRecordsColumn(): CountIndexPatternColumn {
    return {
      dataType: 'number',
      isBucketed: false,
      label: 'Count of records',
      operationType: 'count',
      scale: 'ratio',
      sourceField: 'Records',
    } as CountIndexPatternColumn;
  }

  getLayer() {
    return {
      columnOrder: ['x-axis-column', 'y-axis-column'],
      columns: {
        'x-axis-column': this.getXAxis(),
        'y-axis-column': this.getMainYAxis(),
      },
      incompleteColumns: {},
    };
  }

  getXyState(): XYState {
    return {
      legend: { isVisible: true, position: 'right' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      curveType: 'CURVE_MONOTONE_X' as XYCurveType,
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'line',
      layers: [
        {
          accessors: ['y-axis-column'],
          layerId: 'layer1',
          seriesType: this.seriesType ?? 'line',
          palette: this.reportViewConfig.palette,
          yConfig: [{ forAccessor: 'y-axis-column', color: 'green' }],
          xAccessor: 'x-axis-column',
        },
      ],
    };
  }

  parseFilters() {
    const defaultFilters = this.reportViewConfig.filters ?? [];
    const parsedFilters = this.reportViewConfig.filters ? [...defaultFilters] : [];

    this.filters.forEach(({ field, values = [], notValues = [] }) => {
      const fieldMeta = this.indexPattern.fields.find((fieldT) => fieldT.name === field)!;

      if (values?.length > 0) {
        if (values?.length > 1) {
          const multiFilter = buildPhrasesFilter(fieldMeta, values, this.indexPattern);
          parsedFilters.push(multiFilter);
        } else {
          const filter = buildPhraseFilter(fieldMeta, values[0], this.indexPattern);
          parsedFilters.push(filter);
        }
      }

      if (notValues?.length > 0) {
        if (notValues?.length > 1) {
          const multiFilter = buildPhrasesFilter(fieldMeta, notValues, this.indexPattern);
          multiFilter.meta.negate = true;
          parsedFilters.push(multiFilter);
        } else {
          const filter = buildPhraseFilter(fieldMeta, notValues[0], this.indexPattern);
          filter.meta.negate = true;
          parsedFilters.push(filter);
        }
      }
    });

    return parsedFilters;
  }

  getJSON(): TypedLensByValueInput['attributes'] {
    return {
      title: 'Prefilled from exploratory view app',
      description: '',
      visualizationType: 'lnsXY',
      references: [
        {
          id: this.indexPattern.id!,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: this.indexPattern.id!,
          name: getLayerReferenceName('layer1'),
          type: 'index-pattern',
        },
      ],
      state: {
        datasourceStates: {
          indexpattern: {
            layers: this.layers,
          },
        },
        visualization: this.visualization,
        query: { query: '', language: 'kuery' },
        filters: this.parseFilters(),
      },
    };
  }
}
