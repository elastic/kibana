/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, euiPaletteColorBlind } from '@elastic/eui';

import { SavedObjectReference } from '@kbn/core/server';
import { DataView } from '@kbn/data-views-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import { i18n } from '@kbn/i18n';
import {
  DateHistogramIndexPatternColumn,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { LensByReferenceInput } from '@kbn/lens-plugin/public/embeddable';
import { MetricVisualizationState } from '@kbn/lens-plugin/public/visualizations/metric/visualization';

import { KibanaLogic } from '../../../../shared/kibana';
import { EngineAnalyticsLogic } from '../engine_analytics_logic';

enum lensTypes {
  lnsXY = 'lnsXY',
  lnsMetric = 'lnsMetric',
}

const getReferences = (dataViewId: string, lensType: string): SavedObjectReference[] => {
  const referenceName =
    lensType === lensTypes.lnsXY ? LENS_LAYERS.xy.layerId : LENS_LAYERS.metrics.layerId;
  return [
    {
      id: dataViewId,
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: dataViewId,
      name: 'indexpattern-datasource-layer-' + `${referenceName}`,
      type: 'index-pattern',
    },
  ];
};

export enum filterBy {
  queries = 'Queries',
  noResults = 'No Results',
}

const chartAttributes = {
  [filterBy.queries]: {
    chartColor: euiPaletteColorBlind()[0],
    label: i18n.translate(
      'xpack.enterpriseSearch.content.engine.overview.analytics.lens.queries.chart.title',
      {
        defaultMessage: 'Queries',
      }
    ),
  },
  [filterBy.noResults]: {
    chartColor: euiPaletteColorBlind()[1],
    label: i18n.translate(
      'xpack.enterpriseSearch.content.engine.overview.analytics.lens.withNoResults.chart.title',
      {
        defaultMessage: 'No Results',
      }
    ),
  },
};
const getFormula = {
  [filterBy.queries]: {
    total: 'count(event.customer_data.query)',
    percentage:
      "(count(event.customer_data.query) - count(event.customer_data.query, shift='previous')) / abs(count(event.customer_data.query, shift='previous'))",
  },
  [filterBy.noResults]: {
    total: "count(kql='event.customer_data.totalResults :0')",
    percentage:
      "(count(kql='event.customer_data.totalResults :0') - count(kql='event.customer_data.totalResults :0', shift='previous')) / abs(count(kql='event.customer_data.totalResults :0', shift='previous'))",
  },
};

const LENS_LAYERS = {
  metrics: {
    id: 'metric',
    metricAccessor: 'totalQuery',
    secondaryMetricAccessor: 'percentage',
    layerId: 'metricLayer',
  },
  xy: {
    id: 'xy',
    x: 'timeStamp',
    y: 'queriesCount',
    layerId: 'xYLayer',
  },
};

const getLensXYformulaInsertOrReplaceFormulaColumn = (
  currentFilter: filterBy,
  columnsData: DateHistogramIndexPatternColumn,
  defaultDataView: DataView,
  formulaApi: FormulaPublicApi
) => {
  const dateLayer = formulaApi.insertOrReplaceFormulaColumn(
    LENS_LAYERS.xy.y,
    {
      formula: getFormula[currentFilter]?.total,
      label: chartAttributes[currentFilter].label,
    },
    {
      columnOrder: [LENS_LAYERS.xy.x],
      columns: {
        [LENS_LAYERS.xy.x]: columnsData,
      },
    },
    defaultDataView
  );

  return dateLayer;
};

const getLensMetricformulaInsertOrReplaceFormulaColumn = (
  currentFilter: filterBy,
  BaseLayer: PersistedIndexPatternLayer,
  defaultDataView: DataView,
  formulaApi: FormulaPublicApi,
  secondaryMetricAccessor?: boolean
) => {
  const dateLayer = formulaApi.insertOrReplaceFormulaColumn(
    secondaryMetricAccessor
      ? LENS_LAYERS.metrics.secondaryMetricAccessor
      : LENS_LAYERS.metrics.metricAccessor,
    {
      formula: secondaryMetricAccessor
        ? getFormula[currentFilter].percentage
        : getFormula[currentFilter].total,

      format: {
        id: secondaryMetricAccessor ? 'percent' : 'number',
        params: {
          decimals: 0,
        },
      },
    },
    BaseLayer,
    defaultDataView
  );
  return dateLayer;
};
// construct Lens attributes for Area - (lnsXY) chart
export const getLensXYLensAttributes = (
  defaultDataView: DataView,
  formulaApi: FormulaPublicApi,
  isShowingTotalQueries: boolean
): TypedLensByValueInput['attributes'] | null => {
  const currentFilter = isShowingTotalQueries ? filterBy.queries : filterBy.noResults;

  const columnsData: DateHistogramIndexPatternColumn = {
    dataType: 'date',
    isBucketed: false,
    customLabel: true,
    operationType: 'date_histogram',
    params: { interval: 'auto' },
    scale: 'ordinal',
    sourceField: (defaultDataView && defaultDataView.timeFieldName) ?? '',
    label: '',
  };

  const dateLayer = getLensXYformulaInsertOrReplaceFormulaColumn(
    currentFilter,
    columnsData,
    defaultDataView,
    formulaApi
  );

  if (!dateLayer) {
    return null;
  }

  const dataLayer = {
    accessors: [LENS_LAYERS.xy.y],
    layerId: [LENS_LAYERS.xy.layerId],
    layerType: 'data',
    seriesType: 'area',
    xAccessor: LENS_LAYERS.xy.x,
    yConfig: [
      {
        forAccessor: LENS_LAYERS.xy.y,
        color: chartAttributes[currentFilter].chartColor,
      },
    ],
  };

  return {
    visualizationType: lensTypes.lnsXY,
    title: '',
    references: getReferences(defaultDataView.id ?? '', lensTypes.lnsXY),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            xYLayer: dateLayer,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        layers: [dataLayer],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        curveType: 'CURVE_MONOTONE_X',
      },
    },
  };
};

// construct Lens attributes for Metric - (lnsMetric) chart
export const getLensMetricLensAttributes = (
  defaultDataView: DataView,
  formulaApi: FormulaPublicApi,
  isShowingTotalQueries: boolean
): TypedLensByValueInput['attributes'] | null => {
  const metricState: MetricVisualizationState = {
    layerId: LENS_LAYERS.metrics.layerId,
    layerType: 'data',
    metricAccessor: LENS_LAYERS.metrics.metricAccessor, // col2
    secondaryMetricAccessor: LENS_LAYERS.metrics.secondaryMetricAccessor, // col1
    secondaryPrefix: '',
  };
  const totalQueriesBaseLayer: PersistedIndexPatternLayer = {
    columnOrder: [LENS_LAYERS.metrics.secondaryMetricAccessor], // col1
    columns: {
      [LENS_LAYERS.metrics.secondaryMetricAccessor]: {
        customLabel: true,
        dataType: 'number',
        isBucketed: false,
        label: '',
        operationType: 'formula',
        scale: 'ratio',
        sourceField: 'event.customer_data.query',
      },
    },
  };
  const currentFilter = isShowingTotalQueries ? filterBy.queries : filterBy.noResults;

  const totalQueriesDataLayer = getLensMetricformulaInsertOrReplaceFormulaColumn(
    currentFilter,
    totalQueriesBaseLayer,
    defaultDataView,
    formulaApi,
    true
  );

  if (!totalQueriesDataLayer) {
    return null;
  }

  const totalQueriesWithNoResultsBaseLayer: PersistedIndexPatternLayer = {
    columnOrder: [LENS_LAYERS.metrics.metricAccessor],
    columns: {
      [LENS_LAYERS.metrics.metricAccessor]: {
        customLabel: true,
        dataType: 'number',
        isBucketed: false,
        label: 'Total queries',
        operationType: 'formula',
        scale: 'ratio',
        sourceField: '___records___',
      },
    },
  };
  const totalQueriesWithNoResultsDataLayer = getLensMetricformulaInsertOrReplaceFormulaColumn(
    currentFilter,
    totalQueriesWithNoResultsBaseLayer,
    defaultDataView,
    formulaApi
  );

  if (!totalQueriesWithNoResultsDataLayer) {
    return null;
  }
  return {
    references: getReferences(defaultDataView.id ?? '', lensTypes.lnsMetric),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [LENS_LAYERS.metrics.layerId]: {
              ...totalQueriesDataLayer,
              ...totalQueriesWithNoResultsDataLayer,
              columnOrder: [
                ...totalQueriesDataLayer.columnOrder,
                ...totalQueriesWithNoResultsDataLayer.columnOrder,
              ],
              columns: {
                ...totalQueriesDataLayer.columns,
                ...totalQueriesWithNoResultsDataLayer.columns,
              },
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: metricState,
    },
    title: '',
    visualizationType: lensTypes.lnsMetric,
  };
};
interface EngineAnalyticsLensProps {
  attributes: TypedLensByValueInput['attributes'] | null;
  metricAttributesNoResultsFlag?: boolean; // determines which type of metric attribute we are fetching
  metricAttributesQueriesFlag?: boolean;
}
export const EngineAnalyticsLens: React.FC<EngineAnalyticsLensProps> = ({
  metricAttributesNoResultsFlag,
  metricAttributesQueriesFlag,
  attributes,
}) => {
  const {
    lens: { EmbeddableComponent },
  } = useValues(KibanaLogic);
  const {
    setIsLoading,
    setTotalQueries,
    setTotalQueriesPercentage,
    setNoResults,
    setNoResultsPercentage,
  } = useActions(EngineAnalyticsLogic);
  const { timeRange } = useValues(EngineAnalyticsLogic);

  const displayNone = metricAttributesQueriesFlag || metricAttributesNoResultsFlag ? 'none' : '';
  const lensChartId =
    metricAttributesQueriesFlag || metricAttributesNoResultsFlag
      ? `${lensTypes.lnsMetric}-${attributes?.references?.[0]?.id}`
      : `${lensTypes.lnsXY}-${attributes?.references?.[0]?.id}`;

  const onDataLoad: LensByReferenceInput['onLoad'] = (isLoading, adapters) => {
    setIsLoading(isLoading);
    if (adapters) {
      const total =
        adapters?.tables?.tables?.[LENS_LAYERS.metrics.layerId]?.rows[0]?.totalQuery ?? null;
      const percentage =
        adapters?.tables?.tables?.[LENS_LAYERS.metrics.layerId]?.rows[0]?.percentage * 100 ?? null;
      if (metricAttributesQueriesFlag && !metricAttributesNoResultsFlag) {
        setTotalQueries(total);
        setTotalQueriesPercentage(percentage);
      } else if (metricAttributesNoResultsFlag && !metricAttributesQueriesFlag) {
        setNoResults(total);
        setNoResultsPercentage(percentage);
      }
    }
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          {attributes ? (
            <EmbeddableComponent
              id={'engines-analytics-lens-' + lensChartId}
              withDefaultActions={false}
              style={{ display: displayNone, height: 500 }}
              timeRange={timeRange}
              attributes={attributes}
              onLoad={onDataLoad}
              viewMode={ViewMode.VIEW}
            />
          ) : (
            <></>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
