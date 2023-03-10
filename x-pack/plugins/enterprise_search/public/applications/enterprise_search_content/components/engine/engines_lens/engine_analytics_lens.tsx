/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import {
  DateHistogramIndexPatternColumn,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { MetricVisualizationState } from '@kbn/lens-plugin/public/visualizations/metric/visualization';

import { KibanaLogic } from '../../../../shared/kibana';
import { DataView } from '@kbn/data-views-plugin/public';
import { EngineAnalyticsLogic } from '../engine_analytics_logic';

import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';

import { SavedObjectReference } from '@kbn/core/server';
import { LensByReferenceInput } from '@kbn/lens-plugin/public/embeddable';

enum lensTypes {
  lnsXY = 'lnsXY',
  lnsMetric = 'lnsMetric',
}

const getDataViewId = (dataView: DataView): string => {
  return dataView && dataView.id ? dataView?.id : '';
};
const getReferences = (dataViewId: string, lensType: string): SavedObjectReference[] => {
  const referenceName =
    lensType == lensTypes.lnsXY ? LENS_LAYERS.xy.layerId : LENS_LAYERS.metrics.layerId;
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

export const chartAttributes = {
  [filterBy.queries]: {
    chartColor: '#54B399',
    label: i18n.translate(
      'xpack.enterpriseSearch.content.engine.overview.analytics.lens.queries.chart.title',
      {
        defaultMessage: 'Queries',
      }
    ),
  },
  [filterBy.noResults]: {
    chartColor: '$euiColorVis1',
    label: i18n.translate(
      'xpack.enterpriseSearch.content.engine.overview.analytics.lens.withNoResults.chart.title',
      {
        defaultMessage: 'No Results',
      }
    ),
  },
};

const LENS_LAYERS = {
  metrics: {
    id: 'metric',
    metricAccessor: 'totalQuery', // col2
    secondaryMetricAccessor: 'percentage', //col 1
    layerId: 'metricLayer',
  },
  xy: {
    id: 'xy',
    x: 'timeStamp',
    y: 'queriesCount',
    layerId: 'xYLayer',
  },
};

export interface WithLensDataInputProps {
  filterBy: string;
  timeRange: TimeRange;
}

export interface lensDataOutputProps
  extends lensDataNoResultsLogicOutputProps,
    lensDataQueriesCardLogicOutputProps {
  isLoading?: boolean;
}
// have two types of card - Queries, noResults
export interface lensDataNoResultsLogicOutputProps {
  noResultsMetric?: number; //queriesWithNoResults
  noResultsSecondaryMetric?: number; //percentage
}

export interface lensDataQueriesCardLogicOutputProps {
  queriesMetric?: number; //Total query
  queriesSecondaryMetric?: number; //percentage
}

/*
  lensType -  type of lens : xy / metric
  xy -> queries or no results
  metric -> calculate Q, Q%, No res , No Res %

  currentFilter - type of card currently showing
    * queries
    * no Results

  //required : "(count(event.customer_data.query) - count(event.customer_data.query, shift='previous')) / abs(count(event.customer_data.query, shift='previous'))",
   count(event.customer_data.query)

*/

export const getFormula = {
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
//constructs XY Lens attributes
export const getLensXYLensAttributes = (
  defaultDataView: DataView,
  formulaApi: FormulaPublicApi,
  isShowingTotalQueries: boolean
): TypedLensByValueInput['attributes'] | null => {
  // TODO:: check if dataView is null before

  // const dataViewId = defaultDataView && defaultDataView.id ? defaultDataView?.id : '';
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
    references: getReferences(getDataViewId(defaultDataView), lensTypes.lnsXY),
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

//constructs Metric Lens attributes
export const getLensMetricLensAttributes = (
  defaultDataView: DataView,
  formulaApi: FormulaPublicApi,
  isShowingTotalQueries: boolean
): TypedLensByValueInput['attributes'] | null => {
  const metricState: MetricVisualizationState = {
    layerId: LENS_LAYERS.metrics.layerId,
    layerType: 'data',
    metricAccessor: LENS_LAYERS.metrics.metricAccessor, //col2
    secondaryMetricAccessor: LENS_LAYERS.metrics.secondaryMetricAccessor, //col1
    secondaryPrefix: '',
  };
  const totalQueriesBaseLayer: PersistedIndexPatternLayer = {
    columnOrder: [LENS_LAYERS.metrics.secondaryMetricAccessor], //col1
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
    columnOrder: [LENS_LAYERS.metrics.metricAccessor], //col2
    columns: {
      [LENS_LAYERS.metrics.metricAccessor]: {
        //col2
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
    visualizationType: lensTypes.lnsMetric,
    title: '',

    references: getReferences(getDataViewId(defaultDataView), lensTypes.lnsMetric),
  };
};
interface EngineAnalyticsLensProps {
  // metricCardType?: metricCardTypes;
  timeRange: { from: string; to: string };
  metricAttributesNoResultsFlag?: boolean;
  metricAttributesQueriesFlag?: boolean;
  attributes: TypedLensByValueInput['attributes'] | null;
}
export const EngineAnalyticsLens: React.FC<EngineAnalyticsLensProps> = ({
  timeRange,
  // metricCardType,
  metricAttributesNoResultsFlag,
  metricAttributesQueriesFlag,
  attributes,
}) => {
  const {
    lens: { EmbeddableComponent },
    data: { dataViews, search },
  } = useValues(KibanaLogic);
  const {
    setIsLoading,
    setTotalQueries,
    setTotalQueriesPercentage,
    setNoResults,
    setNoResultsPercentage,
  } = useActions(EngineAnalyticsLogic);
  const {
    isNoResultsCardVisible,
    searchSessionId,
    // startDate,
    // endDate,
    // time,
  } = useValues(EngineAnalyticsLogic);

  const displayNone = metricAttributesQueriesFlag || metricAttributesNoResultsFlag ? 'none' : '';

  const onDataLoad: LensByReferenceInput['onLoad'] = (isLoading, adapters) => {
    setIsLoading(isLoading);
    if (adapters) {
      if (metricAttributesQueriesFlag) {
        setTotalQueries(
          adapters?.tables?.tables?.[LENS_LAYERS.metrics.layerId]?.rows[0]?.totalQuery ?? null
        );
        setTotalQueriesPercentage(
          adapters?.tables?.tables?.[LENS_LAYERS.metrics.layerId]?.rows[0]?.percentage * 100 ?? null
        );
      } else if (metricAttributesNoResultsFlag) {
        setNoResults(
          adapters?.tables?.tables?.[LENS_LAYERS.metrics.layerId]?.rows[0]?.totalQuery ?? null
        );
        setNoResultsPercentage(
          adapters?.tables?.tables?.[LENS_LAYERS.metrics.layerId]?.rows[0]?.percentage * 100 ?? null
        );
      }
    }
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          {attributes && searchSessionId ? (
            <EmbeddableComponent
              id={'engines-analytics-lens-' + `${lensTypes.lnsXY}`}
              withDefaultActions
              style={{ display: displayNone, height: 500 }}
              timeRange={timeRange}
              attributes={attributes}
              searchSessionId={searchSessionId}
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
