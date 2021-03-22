/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
  XYState,
} from '../../../../../../lens/public';
import {
  buildPhraseFilter,
  buildPhrasesFilter,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/common';
import { FieldLabels } from './constants';
import { DataSeries, UrlFilter } from '../types';
import { ESFilter } from '../../../../../../../../typings/elasticsearch';

export class LensAttributes {
  indexPattern: IIndexPattern;
  layers: Record<string, PersistedIndexPatternLayer>;
  visualization: XYState;
  filters: UrlFilter[];
  seriesType: string;
  reportViewConfig: DataSeries;
  reportDefinitions: Record<string, string>;

  constructor(
    indexPattern: IIndexPattern,
    reportViewConfig: DataSeries,
    seriesType: string,
    filters: UrlFilter[],
    metricType?: string,
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
    this.addLayer();
    this.visualization = this.getXyState();
  }

  addBreakdown(sourceField: string) {
    this.layers.layer1.columns['break-down-column'] = {
      sourceField,
      label: `Top values of user_agent.name${FieldLabels[sourceField]}`,
      dataType: 'string',
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
    this.layers.layer1.columns['break-down-column'] = undefined;

    this.layers.layer1.columnOrder = ['x-axis-column', 'y-axis-column'];

    this.visualization.layers[0].splitAccessor = undefined;
  }

  getNumberColumn(sourceField: string) {
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

  getDateHistogramColumn(sourceField: string) {
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

    let xAxisField = xAxisColumn.sourceField;

    if (xAxisField) {
      const rdf = this.reportViewConfig.reportDefinitions ?? [];

      const customField = rdf.find(({ field }) => field === xAxisField);

      if (customField && this.reportDefinitions[xAxisField]) {
        xAxisField = this.reportDefinitions[xAxisField];
      }

      const fieldMeta = this.indexPattern.fields.find((field) => field.name === xAxisField);

      if (fieldMeta?.type === 'date') {
        return this.getDateHistogramColumn(xAxisField);
      }
      if (fieldMeta?.type === 'number') {
        return this.getNumberColumn(xAxisField);
      }
    }

    if (xAxisColumn)
      return {
        label: 'Page load duration (Seconds)',
        dataType: 'number',
        operationType: 'range',
        sourceField: 'transaction.duration.us',
        isBucketed: true,
        scale: 'interval',
        params: {
          type: 'histogram',
          ranges: [{ from: 0, to: 1000, label: '' }],
          maxBars: 'auto',
        },
      };
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
    };
  }

  addLayer() {
    this.layers.layer1 = {
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
      // fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'line',
      // preferredSeriesType: 'bar_stacked',
      layers: [
        {
          accessors: ['y-axis-column'],
          layerId: 'layer1',
          seriesType: this.seriesType ?? 'line',
          palette: this.reportViewConfig.palette ?? undefined,
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
          parsedFilters.push(multiFilter as ESFilter);
        } else {
          const filter = buildPhraseFilter(fieldMeta, values[0], this.indexPattern);
          parsedFilters.push(filter as ESFilter);
        }
      }

      if (notValues?.length > 0) {
        if (notValues?.length > 1) {
          const multiFilter = buildPhrasesFilter(fieldMeta, notValues, this.indexPattern);
          multiFilter.meta.negate = true;
          parsedFilters.push(multiFilter as ESFilter);
        } else {
          const filter = buildPhraseFilter(fieldMeta, notValues[0], this.indexPattern);
          filter.meta.negate = true;
          parsedFilters.push(filter as ESFilter);
        }
      }
    });

    return parsedFilters;
  }

  getJSON(): TypedLensByValueInput['attributes'] {
    return {
      title: 'Prefilled from example app',
      description: '',
      visualizationType: 'lnsXY',
      references: [
        {
          id: this.indexPattern.id,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: this.indexPattern.id,
          name: 'indexpattern-datasource-layer-layer1',
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
