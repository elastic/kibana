/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  LastValueIndexPatternColumn,
  OperationType,
  PersistedIndexPatternLayer,
  RangeIndexPatternColumn,
  SeriesType,
  TypedLensByValueInput,
  XYState,
  XYCurveType,
  DataType,
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
    metricType?: OperationType,
    reportDefinitions?: Record<string, string>
  ) {
    this.indexPattern = indexPattern;
    this.layers = {};
    this.filters = filters ?? [];
    this.reportDefinitions = reportDefinitions ?? {};

    if (typeof reportViewConfig.yAxisColumn.operationType !== undefined && metricType) {
      reportViewConfig.yAxisColumn.operationType = metricType;
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

  getNumberColumn(sourceField: string): RangeIndexPatternColumn {
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

  getXAxis():
    | LastValueIndexPatternColumn
    | DateHistogramIndexPatternColumn
    | RangeIndexPatternColumn {
    const { xAxisColumn } = this.reportViewConfig;

    const { type: fieldType, name: fieldName } = this.getFieldMeta(xAxisColumn.sourceField)!;

    if (fieldType === 'date') {
      return this.getDateHistogramColumn(fieldName);
    }
    if (fieldType === 'number') {
      return this.getNumberColumn(fieldName);
    }

    // FIXME review my approach again
    return this.getDateHistogramColumn(fieldName);
  }

  getFieldMeta(sourceField?: string) {
    let xAxisField = sourceField;

    if (xAxisField) {
      const rdf = this.reportViewConfig.reportDefinitions ?? [];

      const customField = rdf.find(({ field }) => field === xAxisField);

      if (customField) {
        if (this.reportDefinitions[xAxisField]) {
          xAxisField = this.reportDefinitions[xAxisField];
        } else if (customField.defaultValue) {
          xAxisField = customField.defaultValue;
        } else if (customField.options?.[0].field) {
          xAxisField = customField.options?.[0].field;
        }
      }

      return this.indexPattern.getFieldByName(xAxisField);
    }
  }

  getMainYAxis() {
    return {
      dataType: 'number',
      isBucketed: false,
      label: 'Count of records',
      operationType: 'count',
      scale: 'ratio',
      sourceField: 'Records',
      ...this.reportViewConfig.yAxisColumn,
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
