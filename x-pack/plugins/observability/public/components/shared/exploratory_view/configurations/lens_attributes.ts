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
  AvgIndexPatternColumn,
  CardinalityIndexPatternColumn,
  CountIndexPatternColumn,
  DataType,
  DateHistogramIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FiltersIndexPatternColumn,
  MedianIndexPatternColumn,
  OperationMetadata,
  OperationType,
  PercentileIndexPatternColumn,
  LastValueIndexPatternColumn,
  PersistedIndexPatternLayer,
  RangeIndexPatternColumn,
  SeriesType,
  SumIndexPatternColumn,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
  XYCurveType,
  XYState,
  YAxisMode,
  MinIndexPatternColumn,
  MaxIndexPatternColumn,
  FormulaPublicApi,
  FormulaIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PersistableFilter } from '@kbn/lens-plugin/common';
import { urlFiltersToKueryString } from '../utils/stringify_kueries';
import {
  FILTER_RECORDS,
  RECORDS_FIELD,
  RECORDS_PERCENTAGE_FIELD,
  REPORT_METRIC_FIELD,
  TERMS_COLUMN,
  USE_BREAK_DOWN_COLUMN,
  PERCENTILE,
  PERCENTILE_RANKS,
  ReportTypes,
  FORMULA_COLUMN,
} from './constants';
import {
  ColumnFilter,
  MetricOption,
  ParamFilter,
  SeriesConfig,
  SupportedOperations,
  UrlFilter,
  URLReportDefinition,
} from '../types';
import { parseRelativeDate } from '../components/date_range_picker';
import { getDistributionInPercentageColumn } from './lens_columns/overall_column';

export function getLayerReferenceName(layerId: string) {
  return `indexpattern-datasource-layer-${layerId}`;
}

export function buildNumberColumn(sourceField: string) {
  return {
    sourceField,
    dataType: 'number' as DataType,
    isBucketed: false,
    scale: 'ratio' as OperationMetadata['scale'],
  };
}

export function getPercentileParam(operationType: string) {
  return {
    percentile: Number(operationType.split('th')[0]),
  };
}

export const parseCustomFieldName = (
  seriesConfig: SeriesConfig,
  selectedMetricField?: string
): Partial<MetricOption> & { fieldName: string; columnLabel?: string; columnField?: string } => {
  const metricOptions = seriesConfig.metricOptions ?? [];

  if (selectedMetricField) {
    if (metricOptions) {
      const currField = metricOptions.find(
        ({ field, id }) => field === selectedMetricField || id === selectedMetricField
      );

      return {
        ...(currField ?? {}),
        fieldName: selectedMetricField,
        columnLabel: currField?.label,
        columnField: currField?.field,
      };
    }
  }

  return {
    fieldName: selectedMetricField!,
  };
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
  showPercentileAnnotations?: boolean;
}

export class LensAttributes {
  layers: Record<string, PersistedIndexPatternLayer>;
  visualization?: XYState;
  layerConfigs: LayerConfig[] = [];
  isMultiSeries?: boolean;
  seriesReferenceLines: Record<
    string,
    {
      layerData: PersistedIndexPatternLayer;
      layerState: XYState['layers'];
      indexPattern: DataView;
    }
  >;
  globalFilter?: { query: string; language: string };
  reportType: string;
  lensFormulaHelper?: FormulaPublicApi;

  constructor(
    layerConfigs: LayerConfig[],
    reportType: string,
    lensFormulaHelper?: FormulaPublicApi
  ) {
    this.layers = {};
    this.seriesReferenceLines = {};
    this.reportType = reportType;
    this.lensFormulaHelper = lensFormulaHelper;

    layerConfigs.forEach(({ seriesConfig, operationType }) => {
      if (operationType && reportType !== ReportTypes.SINGLE_METRIC) {
        seriesConfig.yAxisColumns.forEach((yAxisColumn) => {
          if (typeof yAxisColumn.operationType !== undefined) {
            yAxisColumn.operationType =
              operationType as FieldBasedIndexPatternColumn['operationType'];
          }
        });
      }
    });

    if (reportType === ReportTypes.SINGLE_METRIC) {
      return;
    }

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
    layerConfig,
  }: {
    sourceField: string;
    layerId: string;
    labels: Record<string, string>;
    indexPattern: DataView;
    layerConfig: LayerConfig;
  }): TermsIndexPatternColumn {
    const { seriesConfig, selectedMetricField } = layerConfig;

    const fieldMeta = indexPattern.getFieldByName(sourceField);
    const { metricOptions } = seriesConfig;

    const { sourceField: yAxisSourceField } = layerConfig.seriesConfig.yAxisColumns[0];

    const isFormulaColumn =
      Boolean(
        metricOptions &&
          (metricOptions.find((option) => option.id === selectedMetricField) as MetricOption)
            ?.formula
      ) || yAxisSourceField === RECORDS_PERCENTAGE_FIELD;

    return {
      sourceField,
      label: `Top values of ${labels[sourceField]}`,
      dataType: fieldMeta?.type as DataType,
      operationType: 'terms',
      scale: 'ordinal',
      isBucketed: true,
      params: {
        orderBy: isFormulaColumn
          ? { type: 'custom' }
          : { type: 'column', columnId: `y-axis-column-${layerId}` },
        size: 10,
        orderDirection: 'desc',
        otherBucket: true,
        missingBucket: false,
        ...(isFormulaColumn
          ? {
              orderAgg: {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
              },
            }
          : {}),
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

  getFiltersColumn({
    label,
    paramFilters,
  }: {
    paramFilters: ParamFilter[];
    label?: string;
  }): FiltersIndexPatternColumn {
    return {
      label: label ?? 'Filters',
      dataType: 'string',
      operationType: 'filters',
      scale: 'ordinal',
      isBucketed: true,
      params: {
        filters: paramFilters,
      },
    };
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
    operationType?: SupportedOperations | 'last_value';
    label?: string;
    seriesConfig: SeriesConfig;
  }) {
    if (columnType === 'operation' || operationType) {
      if (
        operationType &&
        ['median', 'average', 'sum', 'min', 'max', 'unique_count'].includes(operationType)
      ) {
        return this.getNumberOperationColumn({
          sourceField,
          operationType: operationType as SupportedOperations,
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
    operationType: SupportedOperations;
    label?: string;
    seriesConfig: SeriesConfig;
    columnFilter?: ColumnFilter;
  }):
    | MinIndexPatternColumn
    | MaxIndexPatternColumn
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
    layerId: string,
    columnFilter?: string
  ): Record<string, FieldBasedIndexPatternColumn | FormulaIndexPatternColumn> {
    const yAxisColumns = layerConfig.seriesConfig.yAxisColumns;
    const { sourceField: mainSourceField, label: mainLabel } = yAxisColumns[0];
    const lensColumns: Record<string, FieldBasedIndexPatternColumn | FormulaIndexPatternColumn> =
      {};

    // start at 1, because main y axis will have the first percentile breakdown
    for (let i = 1; i < PERCENTILE_RANKS.length; i++) {
      lensColumns[`y-axis-column-${i}`] = {
        ...this.getColumnBasedOnType({
          sourceField: mainSourceField!,
          operationType: PERCENTILE_RANKS[i] as SupportedOperations,
          label: mainLabel,
          layerConfig,
          layerId,
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
      params: getPercentileParam(percentileValue),
      customLabel: true,
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

    if (!xAxisColumn.sourceField) {
      return xAxisColumn as LastValueIndexPatternColumn;
    }

    if (xAxisColumn?.sourceField === USE_BREAK_DOWN_COLUMN) {
      return this.getBreakdownColumn({
        layerId,
        layerConfig,
        indexPattern: layerConfig.indexPattern,
        sourceField: layerConfig.breakdown || layerConfig.seriesConfig.breakdownFields[0],
        labels: layerConfig.seriesConfig.labels,
      });
    }

    if (xAxisColumn.sourceField === REPORT_METRIC_FIELD) {
      const { paramFilters } = this.getFieldMeta(xAxisColumn.sourceField, layerConfig);
      if (paramFilters) {
        return this.getFiltersColumn({ paramFilters });
      }
    }

    return this.getColumnBasedOnType({
      layerConfig,
      layerId,
      label: xAxisColumn.label,
      sourceField: xAxisColumn.sourceField,
    });
  }

  getColumnBasedOnType({
    sourceField,
    label,
    layerConfig,
    operationType,
    colIndex,
    layerId,
  }: {
    sourceField: string;
    operationType?: SupportedOperations;
    label?: string;
    layerId: string;
    layerConfig: LayerConfig;
    colIndex?: number;
  }) {
    const { breakdown, seriesConfig } = layerConfig;
    const {
      formula,
      fieldMeta,
      columnType,
      fieldName,
      columnLabel,
      timeScale,
      columnFilters,
      showPercentileAnnotations,
    } = this.getFieldMeta(sourceField, layerConfig);

    if (columnType === FORMULA_COLUMN) {
      return getDistributionInPercentageColumn({
        layerId,
        formula,
        label: columnLabel ?? label,
        dataView: layerConfig.indexPattern,
        lensFormulaHelper: this.lensFormulaHelper!,
      }).main;
    }

    if (showPercentileAnnotations) {
      this.addThresholdLayer(fieldName, layerId, layerConfig);
    }

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
      const {
        palette,
        fieldName,
        columnType,
        columnLabel,
        columnFilters,
        timeScale,
        paramFilters,
        showPercentileAnnotations,
        formula,
      } = parseCustomFieldName(layerConfig.seriesConfig, layerConfig.selectedMetricField);
      const fieldMeta = layerConfig.indexPattern.getFieldByName(fieldName!);
      return {
        formula,
        palette,
        fieldMeta,
        fieldName,
        columnType,
        columnLabel,
        columnFilters,
        timeScale,
        paramFilters,
        showPercentileAnnotations:
          layerConfig.showPercentileAnnotations ?? showPercentileAnnotations,
      };
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
      return getDistributionInPercentageColumn({
        label,
        layerId,
        columnFilter,
        dataView: layerConfig.indexPattern,
        lensFormulaHelper: this.lensFormulaHelper!,
      }).main;
    }

    if (sourceField === RECORDS_FIELD || !sourceField) {
      return this.getRecordsColumn(label, undefined, timeScale);
    }

    return this.getColumnBasedOnType({
      sourceField,
      label,
      layerConfig,
      colIndex: 0,
      operationType: (breakdown === PERCENTILE
        ? PERCENTILE_RANKS[0]
        : operationType) as SupportedOperations,
      layerId,
    });
  }

  getChildYAxises(
    layerConfig: LayerConfig,
    layerId: string,
    columnFilter?: string,
    forAccessorsKeys?: boolean
  ) {
    const { breakdown } = layerConfig;
    const lensColumns: Record<
      string,
      FieldBasedIndexPatternColumn | SumIndexPatternColumn | FormulaIndexPatternColumn
    > = {};
    const yAxisColumns = layerConfig.seriesConfig.yAxisColumns;
    const { sourceField: mainSourceField, label: mainLabel } = yAxisColumns[0];

    if (mainSourceField === RECORDS_PERCENTAGE_FIELD && layerId && !forAccessorsKeys) {
      return getDistributionInPercentageColumn({
        label: mainLabel,
        layerId,
        columnFilter,
        dataView: layerConfig.indexPattern,
        lensFormulaHelper: this.lensFormulaHelper!,
      }).supportingColumns;
    }

    if (mainSourceField && !forAccessorsKeys) {
      const { columnLabel, formula, columnType } = this.getFieldMeta(mainSourceField, layerConfig);

      if (columnType === FORMULA_COLUMN) {
        return getDistributionInPercentageColumn({
          label: columnLabel,
          layerId,
          formula,
          dataView: layerConfig.indexPattern,
          lensFormulaHelper: this.lensFormulaHelper!,
        }).supportingColumns;
      }
    }

    if (yAxisColumns.length === 1 && breakdown === PERCENTILE) {
      return this.getPercentileBreakdowns(layerConfig, layerId, columnFilter);
    }

    if (yAxisColumns.length === 1) {
      return lensColumns;
    }

    // starting from 1 index since 0 column is used as main column
    for (let i = 1; i < yAxisColumns.length; i++) {
      const { sourceField, operationType, label } = yAxisColumns[i];

      lensColumns[`y-axis-column-${i}`] = this.getColumnBasedOnType({
        sourceField: sourceField!,
        operationType: operationType as SupportedOperations,
        label,
        layerConfig,
        colIndex: i,
        layerId,
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
                  layerConfig,
                }),
              }
            : {}),
          ...this.getChildYAxises(layerConfig, layerId, columnFilter),
        },
        incompleteColumns: {},
      };
    });

    Object.entries(this.seriesReferenceLines).forEach(([id, { layerData }]) => {
      layers[id] = layerData;
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
        x: false,
        yLeft: !this.isMultiSeries,
        yRight: !this.isMultiSeries,
      },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: false, yLeft: true, yRight: true },
      preferredSeriesType: 'line',
      layers: this.getDataLayers(),
      ...(this.layerConfigs[0].seriesConfig.yTitle
        ? { yTitle: this.layerConfigs[0].seriesConfig.yTitle }
        : {}),
    };
  }

  getDataLayers(): XYState['layers'] {
    const dataLayers = this.layerConfigs.map((layerConfig, index) => {
      const { sourceField } = layerConfig.seriesConfig.yAxisColumns[0];

      let palette = layerConfig.seriesConfig.palette;

      if (sourceField) {
        const fieldMeta = this.getFieldMeta(sourceField, layerConfig);
        if (fieldMeta.palette) {
          palette = fieldMeta.palette;
        }
      }

      return {
        accessors: [
          `y-axis-column-layer${index}`,
          ...Object.keys(this.getChildYAxises(layerConfig, `layer${index}`, undefined, true)),
        ],
        layerId: `layer${index}`,
        layerType: 'data' as any,
        seriesType: layerConfig.seriesType || layerConfig.seriesConfig.defaultSeriesType,
        palette: palette ?? layerConfig.seriesConfig.palette,
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
                ? ('left' as YAxisMode)
                : ('right' as YAxisMode),
          },
        ],
        xAccessor: `x-axis-column-layer${index}`,
        ...(layerConfig.breakdown &&
        layerConfig.breakdown !== PERCENTILE &&
        layerConfig.seriesConfig.xAxisColumn.sourceField !== USE_BREAK_DOWN_COLUMN
          ? { splitAccessor: `breakdown-column-layer${index}` }
          : {}),
        ...(this.layerConfigs[0].seriesConfig.yTitle
          ? { yTitle: this.layerConfigs[0].seriesConfig.yTitle }
          : {}),
      };
    });

    const referenceLineLayers: XYState['layers'] = [];

    Object.entries(this.seriesReferenceLines).forEach(([_id, { layerState }]) => {
      referenceLineLayers.push(layerState[0]);
    });

    return [...dataLayers, ...referenceLineLayers];
  }

  addThresholdLayer(
    fieldName: string,
    layerId: string,
    { seriesConfig, indexPattern }: LayerConfig
  ) {
    const referenceLineLayerId = `${layerId}-reference-lines`;

    const referenceLineColumns = this.getThresholdColumns(
      fieldName,
      referenceLineLayerId,
      seriesConfig
    );

    const layerData = {
      columnOrder: Object.keys(referenceLineColumns),
      columns: referenceLineColumns,
      incompleteColumns: {},
    };

    const layerState = this.getThresholdLayer(fieldName, referenceLineLayerId, seriesConfig);

    this.seriesReferenceLines[referenceLineLayerId] = { layerData, layerState, indexPattern };
  }

  getThresholdLayer(
    fieldName: string,
    referenceLineLayerId: string,
    seriesConfig: SeriesConfig
  ): XYState['layers'] {
    const columns = this.getThresholdColumns(fieldName, referenceLineLayerId, seriesConfig);

    return [
      {
        layerId: referenceLineLayerId,
        accessors: Object.keys(columns),
        layerType: 'referenceLine',
        yConfig: Object.keys(columns).map((columnId) => ({
          axisMode: 'bottom',
          color: '#6092C0',
          forAccessor: columnId,
          lineStyle: 'solid',
          lineWidth: 2,
          textVisibility: true,
        })),
      },
    ];
  }

  getThresholdColumns(fieldName: string, layerId: string, seriesConfig: SeriesConfig) {
    const referenceLines = ['50th', '75th', '90th', '95th', '99th'];
    const columns: Record<string, PercentileIndexPatternColumn> = {};

    referenceLines.forEach((referenceLine) => {
      columns[`${referenceLine}-percentile-reference-line-${layerId}`] = {
        ...this.getPercentileNumberColumn(fieldName, referenceLine, seriesConfig),
        label: referenceLine,
      };
    });

    return columns;
  }

  getReferences() {
    const uniqueIndexPatternsIds = Array.from(
      new Set([...this.layerConfigs.map(({ indexPattern }) => indexPattern.id)])
    );

    const referenceLineIndexReferences = Object.entries(this.seriesReferenceLines).map(
      ([id, { indexPattern }]) => ({
        id: indexPattern.id!,
        name: getLayerReferenceName(id),
        type: 'index-pattern',
      })
    );

    return [
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
      ...referenceLineIndexReferences,
    ];
  }

  getJSON(lastRefresh?: number): TypedLensByValueInput['attributes'] {
    const query = this.globalFilter || this.layerConfigs[0].seriesConfig.query;

    return {
      title: 'Prefilled from exploratory view app',
      description: lastRefresh ? `Last refreshed at ${new Date(lastRefresh).toISOString()}` : '',
      visualizationType: 'lnsXY',
      references: this.getReferences(),
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
