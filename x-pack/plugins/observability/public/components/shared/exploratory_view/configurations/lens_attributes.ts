/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { ExistsFilter, isExistsFilter } from '@kbn/es-query';
import {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  AvgIndexPatternColumn,
  MedianIndexPatternColumn,
  PercentileIndexPatternColumn,
  LastValueIndexPatternColumn,
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
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PersistableFilter } from '@kbn/lens-plugin/common';
import { urlFiltersToKueryString } from '../utils/stringify_kueries';
import {
  FILTER_RECORDS,
  USE_BREAK_DOWN_COLUMN,
  TERMS_COLUMN,
  REPORT_METRIC_FIELD,
  RECORDS_FIELD,
  RECORDS_PERCENTAGE_FIELD,
  PERCENTILE,
  PERCENTILE_RANKS,
  ReportTypes,
} from './constants';
import { ColumnFilter, SeriesConfig, UrlFilter, URLReportDefinition } from '../types';
import { parseRelativeDate } from '../components/date_range_picker';
import { getDistributionInPercentageColumn } from './lens_columns/overall_column';

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

export const parseCustomFieldName = (seriesConfig: SeriesConfig, selectedMetricField?: string) => {
  let columnType;
  let columnFilters;
  let timeScale;
  let columnLabel;

  const metricOptions = seriesConfig.metricOptions ?? [];

  if (selectedMetricField) {
    if (metricOptions) {
      const currField = metricOptions.find(
        ({ field, id }) => field === selectedMetricField || id === selectedMetricField
      );
      columnType = currField?.columnType;
      columnFilters = currField?.columnFilters;
      timeScale = currField?.timeScale;
      columnLabel = currField?.label;
    }
  }

  return { fieldName: selectedMetricField!, columnType, columnFilters, timeScale, columnLabel };
};

export interface LayerConfig {
  filters?: UrlFilter[];
  seriesConfig: SeriesConfig;
  breakdown?: string;
  seriesType?: SeriesType;
  operationType?: OperationType;
  reportDefinitions: URLReportDefinition;
  time: { to: string; from: string };
  indexPattern: DataView; // TODO: Figure out if this can be renamed or if it's a Lens requirement
  selectedMetricField: string;
  color: string;
  name: string;
}

export class LensAttributes {
  layers: Record<string, PersistedIndexPatternLayer>;
  visualization: XYState;
  layerConfigs: LayerConfig[];
  isMultiSeries: boolean;
  globalFilter?: { query: string; language: string };

  constructor(layerConfigs: LayerConfig[]) {
    this.layers = {};

    layerConfigs.forEach(({ seriesConfig, operationType }) => {
      if (operationType) {
        seriesConfig.yAxisColumns.forEach((yAxisColumn) => {
          if (typeof yAxisColumn.operationType !== undefined) {
            yAxisColumn.operationType =
              operationType as FieldBasedIndexPatternColumn['operationType'];
          }
        });
      }
    });

    this.layerConfigs = layerConfigs;
    this.isMultiSeries = layerConfigs.length > 1;
    this.globalFilter = this.getGlobalFilter(this.isMultiSeries);
    this.layers = this.getLayers();
    this.visualization = this.getXyState();
  }

  getGlobalFilter(isMultiSeries: boolean) {
    if (isMultiSeries) {
      return undefined;
    }
    const defaultLayerFilter = this.layerConfigs[0].seriesConfig.query
      ? ` and ${this.layerConfigs[0].seriesConfig.query.query}`
      : '';
    return {
      query: `${this.getLayerFilters(
        this.layerConfigs[0],
        this.layerConfigs.length
      )}${defaultLayerFilter}`,
      language: 'kuery',
    };
  }

  getBreakdownColumn({
    sourceField,
    layerId,
    labels,
    indexPattern,
  }: {
    sourceField: string;
    layerId: string;
    labels: Record<string, string>;
    indexPattern: DataView;
  }): TermsIndexPatternColumn {
    const fieldMeta = indexPattern.getFieldByName(sourceField);

    return {
      sourceField,
      label: `Top values of ${labels[sourceField]}`,
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
    seriesConfig: SeriesConfig,
    label?: string
  ): RangeIndexPatternColumn {
    return {
      sourceField,
      label: seriesConfig.labels[sourceField] ?? label,
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
    seriesConfig,
  }: {
    sourceField: string;
    label?: string;
    seriesConfig: SeriesConfig;
  }) {
    return this.getNumberOperationColumn({
      sourceField,
      operationType: 'unique_count',
      label,
      seriesConfig,
    });
  }

  getNumberColumn({
    seriesConfig,
    label,
    sourceField,
    columnType,
    columnFilter,
    operationType,
  }: {
    sourceField: string;
    columnType?: string;
    columnFilter?: ColumnFilter;
    operationType?: string;
    label?: string;
    seriesConfig: SeriesConfig;
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
          seriesConfig,
          columnFilter,
        });
      }
      if (operationType === 'last_value') {
        return this.getLastValueOperationColumn({
          sourceField,
          operationType,
          label,
          seriesConfig,
          columnFilter,
        });
      }
      if (operationType?.includes('th')) {
        return this.getPercentileNumberColumn(sourceField, operationType, seriesConfig!);
      }
    }
    return this.getNumberRangeColumn(sourceField, seriesConfig!, label);
  }

  getLastValueOperationColumn({
    sourceField,
    label,
    seriesConfig,
    operationType,
    columnFilter,
  }: {
    sourceField: string;
    operationType: 'last_value';
    label?: string;
    seriesConfig: SeriesConfig;
    columnFilter?: ColumnFilter;
  }): LastValueIndexPatternColumn {
    return {
      ...buildNumberColumn(sourceField),
      operationType,
      label: i18n.translate('xpack.observability.expView.columns.operation.label', {
        defaultMessage: '{operationType} of {sourceField}',
        values: {
          sourceField: label || seriesConfig.labels[sourceField],
          operationType: capitalize(operationType),
        },
      }),
      filter: columnFilter,
      params: {
        sortField: '@timestamp',
        showArrayValues: false,
      },
    };
  }

  getNumberOperationColumn({
    sourceField,
    label,
    seriesConfig,
    operationType,
    columnFilter,
  }: {
    sourceField: string;
    operationType: 'average' | 'median' | 'sum' | 'unique_count';
    label?: string;
    seriesConfig: SeriesConfig;
    columnFilter?: ColumnFilter;
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
          sourceField: label || seriesConfig.labels[sourceField],
          operationType: capitalize(operationType),
        },
      }),
      filter: columnFilter,
      operationType,
    };
  }

  getPercentileBreakdowns(
    layerConfig: LayerConfig,
    columnFilter?: string
  ): Record<string, FieldBasedIndexPatternColumn> {
    const yAxisColumns = layerConfig.seriesConfig.yAxisColumns;
    const { sourceField: mainSourceField, label: mainLabel } = yAxisColumns[0];
    const lensColumns: Record<string, FieldBasedIndexPatternColumn> = {};

    // start at 1, because main y axis will have the first percentile breakdown
    for (let i = 1; i < PERCENTILE_RANKS.length; i++) {
      lensColumns[`y-axis-column-${i}`] = {
        ...this.getColumnBasedOnType({
          sourceField: mainSourceField!,
          operationType: PERCENTILE_RANKS[i],
          label: mainLabel,
          layerConfig,
          colIndex: i,
        }),
        filter: { query: columnFilter || '', language: 'kuery' },
      };
    }
    return lensColumns;
  }

  getPercentileNumberColumn(
    sourceField: string,
    percentileValue: string,
    seriesConfig: SeriesConfig
  ): PercentileIndexPatternColumn {
    return {
      ...buildNumberColumn(sourceField),
      label: i18n.translate('xpack.observability.expView.columns.label', {
        defaultMessage: '{percentileValue} percentile of {sourceField}',
        values: { sourceField: seriesConfig.labels[sourceField]?.toLowerCase(), percentileValue },
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
    const { xAxisColumn } = layerConfig.seriesConfig;

    if (xAxisColumn?.sourceField === USE_BREAK_DOWN_COLUMN) {
      return this.getBreakdownColumn({
        layerId,
        indexPattern: layerConfig.indexPattern,
        sourceField: layerConfig.breakdown || layerConfig.seriesConfig.breakdownFields[0],
        labels: layerConfig.seriesConfig.labels,
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
    const { breakdown, seriesConfig } = layerConfig;
    const { fieldMeta, columnType, fieldName, columnLabel, timeScale, columnFilters } =
      this.getFieldMeta(sourceField, layerConfig);

    const { type: fieldType } = fieldMeta ?? {};

    if (columnType === TERMS_COLUMN) {
      return this.getTermsColumn(fieldName, columnLabel || label);
    }

    if (fieldName === RECORDS_FIELD || columnType === FILTER_RECORDS) {
      return this.getRecordsColumn(
        label || columnLabel,
        colIndex !== undefined ? columnFilters?.[colIndex] : undefined,
        timeScale
      );
    }

    if (fieldType === 'date') {
      return this.getDateHistogramColumn(fieldName);
    }

    if (fieldType === 'number' && breakdown === PERCENTILE) {
      return {
        ...this.getPercentileNumberColumn(
          fieldName,
          operationType || PERCENTILE_RANKS[0],
          seriesConfig!
        ),
        filter: colIndex !== undefined ? columnFilters?.[colIndex] : undefined,
      };
    }

    if (fieldType === 'number') {
      return this.getNumberColumn({
        sourceField: fieldName,
        columnType,
        columnFilter: columnFilters?.[0],
        operationType,
        label: columnLabel || label,
        seriesConfig: layerConfig.seriesConfig,
      });
    }
    if (operationType === 'unique_count') {
      return this.getCardinalityColumn({
        sourceField: fieldName,
        label: columnLabel || label,
        seriesConfig: layerConfig.seriesConfig,
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
    return parseCustomFieldName(layerConfig.seriesConfig, sourceField);
  }

  getFieldMeta(sourceField: string, layerConfig: LayerConfig) {
    if (sourceField === REPORT_METRIC_FIELD) {
      const { fieldName, columnType, columnLabel, columnFilters, timeScale } = parseCustomFieldName(
        layerConfig.seriesConfig,
        layerConfig.selectedMetricField
      );
      const fieldMeta = layerConfig.indexPattern.getFieldByName(fieldName!);
      return { fieldMeta, fieldName, columnType, columnLabel, columnFilters, timeScale };
    } else {
      const fieldMeta = layerConfig.indexPattern.getFieldByName(sourceField);

      return { fieldMeta, fieldName: sourceField };
    }
  }

  getMainYAxis(layerConfig: LayerConfig, layerId: string, columnFilter: string) {
    const { breakdown } = layerConfig;
    const { sourceField, operationType, label, timeScale } =
      layerConfig.seriesConfig.yAxisColumns[0];

    if (sourceField === RECORDS_PERCENTAGE_FIELD) {
      return getDistributionInPercentageColumn({ label, layerId, columnFilter }).main;
    }

    if (sourceField === RECORDS_FIELD || !sourceField) {
      return this.getRecordsColumn(label, undefined, timeScale);
    }

    return this.getColumnBasedOnType({
      sourceField,
      label,
      layerConfig,
      colIndex: 0,
      operationType: breakdown === PERCENTILE ? PERCENTILE_RANKS[0] : operationType,
    });
  }

  getChildYAxises(layerConfig: LayerConfig, layerId?: string, columnFilter?: string) {
    const { breakdown } = layerConfig;
    const lensColumns: Record<string, FieldBasedIndexPatternColumn | SumIndexPatternColumn> = {};
    const yAxisColumns = layerConfig.seriesConfig.yAxisColumns;
    const { sourceField: mainSourceField, label: mainLabel } = yAxisColumns[0];

    if (mainSourceField === RECORDS_PERCENTAGE_FIELD && layerId) {
      return getDistributionInPercentageColumn({ label: mainLabel, layerId, columnFilter })
        .supportingColumns;
    }

    if (yAxisColumns.length === 1 && breakdown === PERCENTILE) {
      return this.getPercentileBreakdowns(layerConfig, columnFilter);
    }

    if (yAxisColumns.length === 1) {
      return lensColumns;
    }

    // starting from 1 index since 0 column is used as main column
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
      sourceField: RECORDS_FIELD,
      filter: columnFilter,
      ...(timeScale ? { timeScale } : {}),
    } as CountIndexPatternColumn;
  }

  getLayerFilters(layerConfig: LayerConfig, totalLayers: number) {
    const {
      filters,
      time,
      seriesConfig: { baseFilters: layerFilters, reportType },
    } = layerConfig;
    let baseFilters = '';

    if (reportType !== ReportTypes.KPI && totalLayers > 1 && time) {
      // for kpi over time, we don't need to add time range filters
      // since those are essentially plotted along the x-axis
      baseFilters += `@timestamp >= ${time.from} and @timestamp <= ${time.to}`;
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
        qFilter.query?.bool.should.forEach((ft: any) => {
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

      if (isExistsFilter(existFilter)) {
        const fieldName = existFilter.query.exists?.field;
        const kql = `${fieldName} : *`;
        if (baseFilters.length > 0) {
          baseFilters += ` and ${kql}`;
        } else {
          baseFilters += kql;
        }
      }
    });

    const urlFilters = urlFiltersToKueryString(filters ?? []);

    if (!baseFilters) {
      return urlFilters;
    }
    if (!urlFilters) {
      return baseFilters;
    }
    return `${urlFilters} and ${baseFilters}`;
  }

  getTimeShift(mainLayerConfig: LayerConfig, layerConfig: LayerConfig, index: number) {
    if (
      index === 0 ||
      mainLayerConfig.seriesConfig.reportType !== ReportTypes.KPI ||
      !layerConfig.time
    ) {
      return null;
    }

    const {
      time: { from: mainFrom },
    } = mainLayerConfig;

    const {
      time: { from },
    } = layerConfig;

    const parsedMainFrom = parseRelativeDate(mainFrom);
    const parsedFrom = parseRelativeDate(from);

    const inDays =
      parsedMainFrom && parsedFrom ? Math.abs(parsedMainFrom.diff(parsedFrom, 'days')) : 0;
    if (inDays > 1) {
      return inDays + 'd';
    }

    const inHours =
      parsedMainFrom && parsedFrom ? Math.abs(parsedMainFrom?.diff(parsedFrom, 'hours')) : 0;
    if (inHours === 0) {
      return null;
    }
    return inHours + 'h';
  }

  getLayers() {
    const layers: Record<string, PersistedIndexPatternLayer> = {};
    const layerConfigs = this.layerConfigs;

    layerConfigs.forEach((layerConfig, index) => {
      const { breakdown, seriesConfig } = layerConfig;

      const layerId = `layer${index}`;
      const columnFilter = this.getLayerFilters(layerConfig, layerConfigs.length);
      const timeShift = this.getTimeShift(this.layerConfigs[0], layerConfig, index);
      const mainYAxis = this.getMainYAxis(layerConfig, layerId, columnFilter);
      const { sourceField } = seriesConfig.xAxisColumn;

      const label = timeShift ? `${mainYAxis.label}(${timeShift})` : mainYAxis.label;

      let filterQuery = columnFilter || mainYAxis.filter?.query;

      if (columnFilter && mainYAxis.filter?.query) {
        filterQuery = `${columnFilter} and ${mainYAxis.filter.query}`;
      }

      layers[layerId] = {
        columnOrder: [
          ...(breakdown && sourceField !== USE_BREAK_DOWN_COLUMN && breakdown !== PERCENTILE
            ? [`breakdown-column-${layerId}`]
            : []),
          `x-axis-column-${layerId}`,
          `y-axis-column-${layerId}`,
          ...Object.keys(this.getChildYAxises(layerConfig, layerId, columnFilter)),
        ],
        columns: {
          [`x-axis-column-${layerId}`]: this.getXAxis(layerConfig, layerId),
          [`y-axis-column-${layerId}`]: {
            ...mainYAxis,
            label,
            filter: {
              query: filterQuery ?? '',
              language: 'kuery',
            },
            ...(timeShift ? { timeShift } : {}),
          },
          ...(breakdown && sourceField !== USE_BREAK_DOWN_COLUMN && breakdown !== PERCENTILE
            ? // do nothing since this will be used a x axis source
              {
                [`breakdown-column-${layerId}`]: this.getBreakdownColumn({
                  layerId,
                  sourceField: breakdown,
                  indexPattern: layerConfig.indexPattern,
                  labels: layerConfig.seriesConfig.labels,
                }),
              }
            : {}),
          ...this.getChildYAxises(layerConfig, layerId, columnFilter),
        },
        incompleteColumns: {},
      };
    });

    return layers;
  }

  getXyState(): XYState {
    return {
      legend: { isVisible: true, showSingleSeries: true, position: 'right' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      curveType: 'CURVE_MONOTONE_X' as XYCurveType,
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: !this.isMultiSeries,
        yRight: !this.isMultiSeries,
      },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'line',
      layers: this.layerConfigs.map((layerConfig, index) => ({
        accessors: [
          `y-axis-column-layer${index}`,
          ...Object.keys(this.getChildYAxises(layerConfig)),
        ],
        layerId: `layer${index}`,
        layerType: 'data',
        seriesType: layerConfig.seriesType || layerConfig.seriesConfig.defaultSeriesType,
        palette: layerConfig.seriesConfig.palette,
        yConfig: layerConfig.seriesConfig.yConfig || [
          {
            forAccessor: `y-axis-column-layer${index}`,
            color: layerConfig.color,
            /* if the fields format matches the field format of the first layer, use the default y axis (right)
             * if not, use the secondary y axis (left) */
            axisMode:
              layerConfig.indexPattern.fieldFormatMap[layerConfig.selectedMetricField]?.id ===
              this.layerConfigs[0].indexPattern.fieldFormatMap[
                this.layerConfigs[0].selectedMetricField
              ]?.id
                ? 'left'
                : 'right',
          },
        ],
        xAccessor: `x-axis-column-layer${index}`,
        ...(layerConfig.breakdown &&
        layerConfig.breakdown !== PERCENTILE &&
        layerConfig.seriesConfig.xAxisColumn.sourceField !== USE_BREAK_DOWN_COLUMN
          ? { splitAccessor: `breakdown-column-layer${index}` }
          : {}),
      })),
      ...(this.layerConfigs[0].seriesConfig.yTitle
        ? { yTitle: this.layerConfigs[0].seriesConfig.yTitle }
        : {}),
    };
  }

  getJSON(lastRefresh: number): TypedLensByValueInput['attributes'] {
    const uniqueIndexPatternsIds = Array.from(
      new Set([...this.layerConfigs.map(({ indexPattern }) => indexPattern.id)])
    );

    const query = this.globalFilter || this.layerConfigs[0].seriesConfig.query;

    return {
      title: 'Prefilled from exploratory view app',
      description: lastRefresh ? `Last refreshed at ${new Date(lastRefresh).toISOString()}` : '',
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
        query: query || { query: '', language: 'kuery' },
        filters: [],
      },
    };
  }
}
