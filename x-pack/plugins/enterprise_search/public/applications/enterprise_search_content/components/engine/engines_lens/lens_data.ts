/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  DateHistogramIndexPatternColumn,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { MetricVisualizationState } from '@kbn/lens-plugin/public/visualizations/metric/visualization';

export const queries = {
  chartColor: '#6092C0',
  label: i18n.translate(
    'xpack.enterpriseSearch.content.engine.overview.analytics.lens.queries.chart.title',
    {
      defaultMessage: 'Queries',
    }
  ),
};
export const withNoResults = {
  chartColor: '#54B399',
  label: i18n.translate(
    'xpack.enterpriseSearch.content.engine.overview.analytics.lens.withNoResults.chart.title',
    {
      defaultMessage: 'No Results',
    }
  ),
};
enum formula {
  totalQueries = 'count(event.customer_data.query)',
  totalQueriesWithNoResults = "count(kql='event.customer_data.totalResults :0')",
  totalQueriesPercentageChange = "(count(event.customer_data.query) - count(event.customer_data.query, shift='previous')) / abs(count(event.customer_data.query, shift='previous'))",
  totalQueriesPercentageChangeWithNoResults = "(count(kql='event.customer_data.totalResults :0') - count(kql='event.customer_data.totalResults :0', shift='previous')) / abs(count(kql='event.customer_data.totalResults :0', shift='previous'))",
}
const metricFormula = (isShowingTotalQueries: boolean) => {
  return isShowingTotalQueries
    ? [formula.totalQueries, formula.totalQueriesPercentageChange]
    : [formula.totalQueriesWithNoResults, formula.totalQueriesPercentageChangeWithNoResults];
};
const xyFormula = (isShowingTotalQueries: boolean) => {
  return isShowingTotalQueries ? formula.totalQueries : formula.totalQueriesWithNoResults;
};

export const getIcon = (percentage: number): string => {
  return percentage >= 0 ? 'sortUp' : 'sortDown';
};

export const getLensXYLensAttributes = (
  dataView: DataView | null,
  formulaApi: FormulaPublicApi,
  isShowingTotalQueries: boolean
): TypedLensByValueInput['attributes'] => {
  const dataLayer = formulaApi.insertOrReplaceFormulaColumn(
    'col2',
    {
      formula: xyFormula(isShowingTotalQueries),
      label: isShowingTotalQueries ? queries.label : withNoResults.label,
    },
    {
      columnOrder: ['col1'],
      columns: {
        col1: {
          dataType: 'date',
          isBucketed: false,
          customLabel: true,
          operationType: 'date_histogram',
          params: { interval: 'auto' },
          scale: 'ordinal',
          sourceField: dataView?.timeFieldName!,
        } as DateHistogramIndexPatternColumn,
      },
    },
    dataView!
  );

  return {
    visualizationType: 'lnsXY',
    title: '',
    references: [
      {
        id: dataView?.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView?.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer!,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        layers: [
          {
            accessors: ['col2'],
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'area',
            xAccessor: 'col1',
            yConfig: [
              {
                forAccessor: 'col2',
                color: isShowingTotalQueries ? withNoResults.chartColor : queries.chartColor,
              },
            ],
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        curveType: 'CURVE_MONOTONE_X',
      },
    },
  };
};

export const getMetricLensAttributes = (
  dataView: DataView | null,
  formulaApi: FormulaPublicApi,
  isShowingTotalQueries: boolean
): TypedLensByValueInput['attributes'] => {
  const metricState: MetricVisualizationState = {
    layerId: 'layer1',
    layerType: 'data',
    metricAccessor: 'col2',
    secondaryMetricAccessor: 'col1',
    secondaryPrefix: '',
  };

  const totalQueriesBaseLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1'],
    columns: {
      col1: {
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
  const totalQueriesDataLayer = formulaApi.insertOrReplaceFormulaColumn(
    'col1',
    {
      formula: metricFormula(isShowingTotalQueries)[1],
      format: {
        id: 'percent',
        params: {
          decimals: 0,
        },
      },
    },
    totalQueriesBaseLayer,
    dataView!
  );

  const totalQueriesWithNoResultsBaseLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col2'],
    columns: {
      col2: {
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
  const totalQueriesWithNoResultsDataLayer = formulaApi.insertOrReplaceFormulaColumn(
    'col2',
    {
      formula: metricFormula(isShowingTotalQueries)[0],
      format: {
        id: 'number',
        params: {
          decimals: 0,
        },
      },
    },

    totalQueriesWithNoResultsBaseLayer,
    dataView!
  );

  return {
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: {
              ...totalQueriesDataLayer,
              ...totalQueriesWithNoResultsDataLayer,
              columnOrder: [
                ...totalQueriesDataLayer!.columnOrder,
                ...totalQueriesWithNoResultsDataLayer!.columnOrder,
              ],
              columns: {
                ...totalQueriesDataLayer!.columns,
                ...totalQueriesWithNoResultsDataLayer!.columns,
              },
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: metricState,
    },
    visualizationType: 'lnsMetric',
    type: 'lens',
    title: '',
    references: [
      {
        id: dataView?.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
  } as TypedLensByValueInput['attributes'];
};
