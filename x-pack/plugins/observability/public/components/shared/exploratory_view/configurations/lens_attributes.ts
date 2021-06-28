/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
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
  SumIndexPatternColumn,
  TermsIndexPatternColumn,
  CardinalityIndexPatternColumn,
} from '../../../../../../lens/public';
import { urlFiltersToKueryString } from '../utils/stringify_kueries';
import { ExistsFilter, IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { FieldLabels, FILTER_RECORDS, USE_BREAK_DOWN_COLUMN, TERMS_COLUMN } from './constants';
import { ColumnFilter, DataSeries, UrlFilter, URLReportDefinition } from '../types';
import { PersistableFilter } from '../../../../../../lens/common';
import { parseAbsoluteDate } from '../series_date_picker/date_range_picker';

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

export const parseCustomFieldName = (
  sourceField: string,
  reportViewConfig: DataSeries,
  selectedDefinitions: URLReportDefinition
) => {
  let fieldName = sourceField;
  let columnType;
  let columnFilters;
  let timeScale;
  let columnLabel;

  const rdf = reportViewConfig.reportDefinitions ?? [];

  const customField = rdf.find(({ field }) => field === fieldName);

  if (customField) {
    if (selectedDefinitions[fieldName]) {
      fieldName = selectedDefinitions[fieldName][0];
      if (customField?.options) {
        const currField = customField?.options?.find(
          ({ field, id }) => field === fieldName || id === fieldName
        );
        columnType = currField?.columnType;
        columnFilters = currField?.columnFilters;
        timeScale = currField?.timeScale;
        columnLabel = currField?.label;
      }
    } else if (customField.options?.[0].field || customField.options?.[0].id) {
      fieldName = customField.options?.[0].field || customField.options?.[0].id;
      columnType = customField.options?.[0].columnType;
      columnFilters = customField.options?.[0].columnFilters;
      timeScale = customField.options?.[0].timeScale;
      columnLabel = customField.options?.[0].label;
    }
  }

  return { fieldName, columnType, columnFilters, timeScale, columnLabel };
};

export interface LayerConfig {
  filters?: UrlFilter[];
  reportConfig: DataSeries;
  breakdown?: string;
  seriesType?: SeriesType;
  operationType?: OperationType;
  reportDefinitions: URLReportDefinition;
  time: { to: string; from: string };
  indexPattern: IndexPattern;
}

export class LensAttributes {
  layers: Record<string, PersistedIndexPatternLayer>;
  visualization: XYState;
  layerConfigs: LayerConfig[];

  constructor(layerConfigs: LayerConfig[]) {
    this.layers = {};

    layerConfigs.forEach(({ reportConfig, operationType }) => {
      if (operationType) {
        reportConfig.yAxisColumns.forEach((yAxisColumn) => {
          if (typeof yAxisColumn.operationType !== undefined) {
            yAxisColumn.operationType = operationType as FieldBasedIndexPatternColumn['operationType'];
          }
        });
      }
    });

    this.layerConfigs = layerConfigs;
    this.layers = this.getLayers();
    this.visualization = this.getXyState();
  }

  getBreakdownColumn({
    sourceField,
    layerId,
    indexPattern,
  }: {
    sourceField: string;
    layerId: string;
    indexPattern: IndexPattern;
  }): TermsIndexPatternColumn {
    const fieldMeta = indexPattern.getFieldByName(sourceField);

    return {
      sourceField,
      label: `Top values of ${FieldLabels[sourceField]}`,
      dataType: fieldMeta?.type as DataType,
      operationType: 'terms',
      scale: 'ordinal',
      isBucketed: true,
      params: {
        orderBy: { type: 'column', columnId: `y-axis-column-${layerId}` },
        size: 10,
        orderDirection: 'desc',
        otherBucket: true,
        missingBucket: false,
      },
    };
  }

  getNumberRangeColumn(
    sourceField: string,
    reportViewConfig: DataSeries,
    label?: string
  ): RangeIndexPatternColumn {
    return {
      sourceField,
      label: reportViewConfig.labels[sourceField] ?? label,
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

  getCardinalityColumn({
    sourceField,
    label,
    reportViewConfig,
  }: {
    sourceField: string;
    label?: string;
    reportViewConfig: DataSeries;
  }) {
    return this.getNumberOperationColumn({
      sourceField,
      operationType: 'unique_count',
      label,
      reportViewConfig,
    });
  }

  getNumberColumn({
    reportViewConfig,
    label,
    sourceField,
    columnType,
    operationType,
  }: {
    sourceField: string;
    columnType?: string;
    operationType?: string;
    label?: string;
    reportViewConfig: DataSeries;
  }) {
    if (columnType === 'operation' || operationType) {
      if (
        operationType === 'median' ||
        operationType === 'average' ||
        operationType === 'sum' ||
        operationType === 'unique_count'
      ) {
        return this.getNumberOperationColumn({
          sourceField,
          operationType,
          label,
          reportViewConfig,
        });
      }
      if (operationType?.includes('th')) {
        return this.getPercentileNumberColumn(sourceField, operationType, reportViewConfig!);
      }
    }
    return this.getNumberRangeColumn(sourceField, reportViewConfig!, label);
  }

  getNumberOperationColumn({
    sourceField,
    label,
    reportViewConfig,
    operationType,
  }: {
    sourceField: string;
    operationType: 'average' | 'median' | 'sum' | 'unique_count';
    label?: string;
    reportViewConfig: DataSeries;
  }):
    | AvgIndexPatternColumn
    | MedianIndexPatternColumn
    | SumIndexPatternColumn
    | CardinalityIndexPatternColumn {
    return {
      ...buildNumberColumn(sourceField),
      label: i18n.translate('xpack.observability.expView.columns.operation.label', {
        defaultMessage: '{operationType} of {sourceField}',
        values: {
          sourceField: label || reportViewConfig.labels[sourceField],
          operationType: capitalize(operationType),
        },
      }),
      operationType,
    };
  }

  getPercentileNumberColumn(
    sourceField: string,
    percentileValue: string,
    reportViewConfig: DataSeries
  ): PercentileIndexPatternColumn {
    return {
      ...buildNumberColumn(sourceField),
      label: i18n.translate('xpack.observability.expView.columns.label', {
        defaultMessage: '{percentileValue} percentile of {sourceField}',
        values: { sourceField: reportViewConfig.labels[sourceField], percentileValue },
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

  getTermsColumn(sourceField: string, label?: string): TermsIndexPatternColumn {
    return {
      operationType: 'terms',
      sourceField,
      label: 'Top values of ' + label || sourceField,
      dataType: 'string',
      isBucketed: true,
      scale: 'ordinal',
      params: {
        size: 10,
        orderBy: {
          type: 'alphabetical',
          fallback: false,
        },
        orderDirection: 'desc',
      },
    };
  }

  getXAxis(layerConfig: LayerConfig, layerId: string) {
    const { xAxisColumn } = layerConfig.reportConfig;

    if (xAxisColumn?.sourceField === USE_BREAK_DOWN_COLUMN) {
      return this.getBreakdownColumn({
        layerId,
        indexPattern: layerConfig.indexPattern,
        sourceField: layerConfig.breakdown || layerConfig.reportConfig.breakdowns[0],
      });
    }

    return this.getColumnBasedOnType({
      layerConfig,
      label: xAxisColumn.label,
      sourceField: xAxisColumn.sourceField!,
    });
  }

  getColumnBasedOnType({
    sourceField,
    label,
    layerConfig,
    operationType,
    colIndex,
  }: {
    sourceField: string;
    operationType?: OperationType;
    label?: string;
    layerConfig: LayerConfig;
    colIndex?: number;
  }) {
    const {
      fieldMeta,
      columnType,
      fieldName,
      columnLabel,
      timeScale,
      columnFilters,
    } = this.getFieldMeta(sourceField, layerConfig);
    const { type: fieldType } = fieldMeta ?? {};

    if (columnType === TERMS_COLUMN) {
      return this.getTermsColumn(fieldName, columnLabel || label);
    }

    if (fieldName === 'Records' || columnType === FILTER_RECORDS) {
      return this.getRecordsColumn(
        columnLabel || label,
        colIndex !== undefined ? columnFilters?.[colIndex] : undefined,
        timeScale
      );
    }

    if (fieldType === 'date') {
      return this.getDateHistogramColumn(fieldName);
    }
    if (fieldType === 'number') {
      return this.getNumberColumn({
        sourceField: fieldName,
        columnType,
        operationType,
        label: columnLabel || label,
        reportViewConfig: layerConfig.reportConfig,
      });
    }
    if (operationType === 'unique_count') {
      return this.getCardinalityColumn({
        sourceField: fieldName,
        label: columnLabel || label,
        reportViewConfig: layerConfig.reportConfig,
      });
    }

    // FIXME review my approach again
    return this.getDateHistogramColumn(fieldName);
  }

  getCustomFieldName({
    sourceField,
    layerConfig,
  }: {
    sourceField: string;
    layerConfig: LayerConfig;
  }) {
    return parseCustomFieldName(
      sourceField,
      layerConfig.reportConfig,
      layerConfig.reportDefinitions
    );
  }

  getFieldMeta(sourceField: string, layerConfig: LayerConfig) {
    const {
      fieldName,
      columnType,
      columnLabel,
      columnFilters,
      timeScale,
    } = this.getCustomFieldName({
      sourceField,
      layerConfig,
    });

    const fieldMeta = layerConfig.indexPattern.getFieldByName(fieldName);

    return { fieldMeta, fieldName, columnType, columnLabel, columnFilters, timeScale };
  }

  getMainYAxis(layerConfig: LayerConfig) {
    const { sourceField, operationType, label } = layerConfig.reportConfig.yAxisColumns[0];

    if (sourceField === 'Records' || !sourceField) {
      return this.getRecordsColumn(label);
    }

    return this.getColumnBasedOnType({
      sourceField,
      operationType,
      label,
      layerConfig,
      colIndex: 0,
    });
  }

  getChildYAxises(layerConfig: LayerConfig) {
    const lensColumns: Record<string, FieldBasedIndexPatternColumn | SumIndexPatternColumn> = {};
    const yAxisColumns = layerConfig.reportConfig.yAxisColumns;
    // 1 means there is only main y axis
    if (yAxisColumns.length === 1) {
      return lensColumns;
    }
    for (let i = 1; i < yAxisColumns.length; i++) {
      const { sourceField, operationType, label } = yAxisColumns[i];

      lensColumns[`y-axis-column-${i}`] = this.getColumnBasedOnType({
        sourceField: sourceField!,
        operationType,
        label,
        layerConfig,
        colIndex: i,
      });
    }
    return lensColumns;
  }

  getRecordsColumn(
    label?: string,
    columnFilter?: ColumnFilter,
    timeScale?: string
  ): CountIndexPatternColumn {
    return {
      dataType: 'number',
      isBucketed: false,
      label: label || 'Count of records',
      operationType: 'count',
      scale: 'ratio',
      sourceField: 'Records',
      filter: columnFilter,
      ...(timeScale ? { timeScale } : {}),
    } as CountIndexPatternColumn;
  }

  getLayerFilters(layerConfig: LayerConfig, totalLayers: number) {
    const {
      filters,
      time: { from, to },
      reportConfig: { filters: layerFilters, reportType },
    } = layerConfig;
    let baseFilters = '';
    if (reportType !== 'kpi-over-time' && totalLayers > 1) {
      // for kpi over time, we don't need to add time range filters
      // since those are essentially plotted along the x-axis
      baseFilters += `@timestamp >= ${from} and @timestamp <= ${to}`;
    }

    layerFilters?.forEach((filter: PersistableFilter | ExistsFilter) => {
      const qFilter = filter as PersistableFilter;
      if (qFilter.query?.match_phrase) {
        const fieldName = Object.keys(qFilter.query.match_phrase)[0];
        const kql = `${fieldName}: ${qFilter.query.match_phrase[fieldName]}`;
        if (baseFilters.length > 0) {
          baseFilters += ` and ${kql}`;
        } else {
          baseFilters += kql;
        }
      }
      if (qFilter.query?.bool?.should) {
        const values: string[] = [];
        let fieldName = '';
        qFilter.query?.bool.should.forEach((ft: PersistableFilter['query']['match_phrase']) => {
          if (ft.match_phrase) {
            fieldName = Object.keys(ft.match_phrase)[0];
            values.push(ft.match_phrase[fieldName]);
          }
        });

        const kueryString = `${fieldName}: (${values.join(' or ')})`;

        if (baseFilters.length > 0) {
          baseFilters += ` and ${kueryString}`;
        } else {
          baseFilters += kueryString;
        }
      }
      const existFilter = filter as ExistsFilter;

      if (existFilter.exists) {
        const fieldName = existFilter.exists.field;
        const kql = `${fieldName} : *`;
        if (baseFilters.length > 0) {
          baseFilters += ` and ${kql}`;
        } else {
          baseFilters += kql;
        }
      }
    });

    const rFilters = urlFiltersToKueryString(filters ?? []);
    if (!baseFilters) {
      return rFilters;
    }
    if (!rFilters) {
      return baseFilters;
    }
    return `${rFilters} and ${baseFilters}`;
  }

  getTimeShift(mainLayerConfig: LayerConfig, layerConfig: LayerConfig, index: number) {
    if (index === 0 || mainLayerConfig.reportConfig.reportType !== 'kpi-over-time') {
      return null;
    }

    const {
      time: { from: mainFrom },
    } = mainLayerConfig;

    const {
      time: { from },
    } = layerConfig;

    const inDays = parseAbsoluteDate(mainFrom).diff(parseAbsoluteDate(from), 'days');
    if (inDays > 1) {
      return inDays + 'd';
    }
    const inHours = parseAbsoluteDate(mainFrom).diff(parseAbsoluteDate(from), 'hours');
    return inHours + 'h';
  }

  getLayers() {
    const layers: Record<string, PersistedIndexPatternLayer> = {};
    const layerConfigs = this.layerConfigs;

    layerConfigs.forEach((layerConfig, index) => {
      const { breakdown } = layerConfig;

      const layerId = `layer${index}`;
      const columnFilter = this.getLayerFilters(layerConfig, layerConfigs.length);
      const timeShift = this.getTimeShift(this.layerConfigs[0], layerConfig, index);
      const mainYAxis = this.getMainYAxis(layerConfig);
      layers[layerId] = {
        columnOrder: [
          `x-axis-column-${layerId}`,
          ...(breakdown ? [`breakdown-column-${layerId}`] : []),
          `y-axis-column-${layerId}`,
          ...Object.keys(this.getChildYAxises(layerConfig)),
        ],
        columns: {
          [`x-axis-column-${layerId}`]: this.getXAxis(layerConfig, layerId),
          [`y-axis-column-${layerId}`]: {
            ...mainYAxis,
            label: timeShift ? `${mainYAxis.label}(${timeShift})` : mainYAxis.label,
            filter: { query: columnFilter, language: 'kuery' },
            ...(timeShift ? { timeShift } : {}),
          },
          ...(breakdown && breakdown !== USE_BREAK_DOWN_COLUMN
            ? // do nothing since this will be used a x axis source
              {
                [`breakdown-column-${layerId}`]: this.getBreakdownColumn({
                  layerId,
                  sourceField: breakdown,
                  indexPattern: layerConfig.indexPattern,
                }),
              }
            : {}),
          ...this.getChildYAxises(layerConfig),
        },
        incompleteColumns: {},
      };
    });

    return layers;
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
      layers: this.layerConfigs.map((layerConfig, index) => ({
        accessors: [
          `y-axis-column-layer${index}`,
          ...Object.keys(this.getChildYAxises(layerConfig)),
        ],
        layerId: `layer${index}`,
        seriesType: layerConfig.seriesType || layerConfig.reportConfig.defaultSeriesType,
        palette: layerConfig.reportConfig.palette,
        yConfig: layerConfig.reportConfig.yConfig || [
          { forAccessor: `y-axis-column-layer${index}` },
        ],
        xAccessor: `x-axis-column-layer${index}`,
        ...(layerConfig.breakdown ? { splitAccessor: `breakdown-column-layer${index}` } : {}),
      })),
      ...(this.layerConfigs[0].reportConfig.yTitle
        ? { yTitle: this.layerConfigs[0].reportConfig.yTitle }
        : {}),
    };
  }

  parseFilters() {}

  getJSON(): TypedLensByValueInput['attributes'] {
    const uniqueIndexPatternsIds = Array.from(
      new Set([...this.layerConfigs.map(({ indexPattern }) => indexPattern.id)])
    );

    return {
      title: 'Prefilled from exploratory view app',
      description: '',
      visualizationType: 'lnsXY',
      references: [
        ...uniqueIndexPatternsIds.map((patternId) => ({
          id: patternId!,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        })),
        ...this.layerConfigs.map(({ indexPattern }, index) => ({
          id: indexPattern.id!,
          name: getLayerReferenceName(`layer${index}`),
          type: 'index-pattern',
        })),
      ],
      state: {
        datasourceStates: {
          indexpattern: {
            layers: this.layers,
          },
        },
        visualization: this.visualization,
        query: { query: '', language: 'kuery' },
        filters: [],
      },
    };
  }
}
