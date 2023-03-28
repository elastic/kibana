/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { useValues } from 'kea';
import moment from 'moment';

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';

import { XYChartElementEvent } from '@elastic/charts/dist/specs/settings';
import { niceTimeFormatter } from '@elastic/charts/dist/utils/data/formatters';
import { EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';

import DateMath from '@kbn/datemath';

import { i18n } from '@kbn/i18n';
import { DateHistogramIndexPatternColumn, TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { euiThemeVars } from '@kbn/ui-theme';

import { KibanaLogic } from '../../../shared/kibana';

import { withLensData, WithLensDataInputProps } from '../../hoc/with_lens_data';
import { FilterBy as ChartIds, getFormulaByFilter } from '../../utils/get_formula_by_filter';

import { AnalyticsCollectionViewMetricWithLens } from './analytics_collection_metric';

const DEFAULT_STROKE_WIDTH = 1;
const HOVER_STROKE_WIDTH = 3;
const CHART_HEIGHT = 490;

interface AnalyticsCollectionChartProps extends WithLensDataInputProps {
  dataViewQuery: string;
}

interface AnalyticsCollectionChartLensProps {
  data: {
    [key in ChartIds]?: Array<[number, number]>;
  };
  isLoading: boolean;
}

export const AnalyticsCollectionChart: React.FC<
  AnalyticsCollectionChartProps & AnalyticsCollectionChartLensProps
> = ({ id: lensId, data, timeRange, dataViewQuery, isLoading }) => {
  const [hoverChart, setHoverChart] = useState<ChartIds | null>(null);
  const [selectedChart, setSelectedChart] = useState<ChartIds>(ChartIds.Searches);
  const { uiSettings, charts: chartSettings } = useValues(KibanaLogic);
  const fromDateParsed = DateMath.parse(timeRange.from);
  const toDataParsed = DateMath.parse(timeRange.to);
  const chartTheme = chartSettings.theme.useChartsTheme();
  const baseChartTheme = chartSettings.theme.useChartsBaseTheme();

  const charts = useMemo(
    () => [
      {
        chartColor: euiThemeVars.euiColorVis0,
        data: data[ChartIds.Searches] || [],
        id: ChartIds.Searches,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.searches',
          {
            defaultMessage: 'Searches',
          }
        ),
      },
      {
        chartColor: euiThemeVars.euiColorVis2,
        data: data[ChartIds.NoResults] || [],
        id: ChartIds.NoResults,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.noResults',
          {
            defaultMessage: 'No results',
          }
        ),
      },
      {
        chartColor: euiThemeVars.euiColorVis3,
        data: data[ChartIds.Clicks] || [],
        id: ChartIds.Clicks,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.clicks',
          {
            defaultMessage: 'Click',
          }
        ),
      },
      {
        chartColor: euiThemeVars.euiColorVis5,
        data: data[ChartIds.Sessions] || [],
        id: ChartIds.Sessions,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.sessions',
          {
            defaultMessage: 'Sessions',
          }
        ),
      },
    ],
    [data]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup gutterSize="m">
        {charts.map(({ name, id }) => (
          <AnalyticsCollectionViewMetricWithLens
            key={id}
            id={`${lensId}-metric-${id}`}
            isSelected={selectedChart === id}
            name={name}
            onClick={(event) => {
              event.currentTarget?.blur();

              setSelectedChart(id);
            }}
            timeRange={timeRange}
            dataViewQuery={dataViewQuery}
            getFormula={getFormulaByFilter.bind(null, id)}
          />
        ))}
      </EuiFlexGroup>

      {isLoading ? (
        <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: CHART_HEIGHT }}>
          <EuiLoadingChart size="l" />
        </EuiFlexGroup>
      ) : (
        <Chart size={['100%', CHART_HEIGHT]}>
          <Settings
            theme={chartTheme}
            baseTheme={baseChartTheme}
            showLegend={false}
            onElementClick={(elements) => {
              const chartId = (elements as XYChartElementEvent[])[0][1]?.specId;

              if (chartId) {
                setSelectedChart(chartId as ChartIds);
              }
            }}
            onElementOver={(elements) => {
              const chartId = (elements as XYChartElementEvent[])[0][1]?.specId;

              if (chartId) {
                setHoverChart(chartId as ChartIds);
              }
            }}
            onElementOut={() => setHoverChart(null)}
          />

          {charts.map(({ data: chartData, id, name, chartColor }) => (
            <AreaSeries
              id={id}
              key={id}
              name={name}
              data={chartData}
              color={chartColor}
              xAccessor={0}
              yAccessors={[1]}
              areaSeriesStyle={{
                area: {
                  opacity: 0.2,
                  visible: selectedChart === id,
                },
                line: {
                  opacity: selectedChart === id ? 1 : 0.5,
                  strokeWidth: [hoverChart, selectedChart].includes(id)
                    ? HOVER_STROKE_WIDTH
                    : DEFAULT_STROKE_WIDTH,
                },
              }}
              yNice
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Sqrt}
              curve={CurveType.CURVE_MONOTONE_X}
            />
          ))}

          <Axis
            id="bottom-axis"
            position={Position.Bottom}
            tickFormat={
              fromDateParsed && toDataParsed
                ? niceTimeFormatter([fromDateParsed.valueOf(), toDataParsed.valueOf()])
                : undefined
            }
            gridLine={{ visible: true }}
          />

          <Axis
            gridLine={{ dash: [], visible: true }}
            hide
            id="left-axis"
            position={Position.Left}
          />

          <Tooltip
            headerFormatter={(tooltipData) =>
              moment(tooltipData.value).format(uiSettings.get('dateFormat'))
            }
            maxTooltipItems={1}
            type={TooltipType.VerticalCursor}
          />
        </Chart>
      )}
    </EuiFlexGroup>
  );
};

const initialValues: AnalyticsCollectionChartLensProps = {
  data: {},
  isLoading: true,
};
const LENS_LAYERS: Array<{ formula: string; id: ChartIds; x: string; y: string }> = Object.values(
  ChartIds
).map((id) => ({ formula: getFormulaByFilter(id), id, x: 'timeline', y: 'values' }));

export const AnalyticsCollectionChartWithLens = withLensData<
  AnalyticsCollectionChartProps,
  AnalyticsCollectionChartLensProps
>(AnalyticsCollectionChart, {
  dataLoadTransform: (isLoading, adapters) =>
    isLoading || !adapters
      ? initialValues
      : {
          data: LENS_LAYERS.reduce(
            (results, { id, x, y }) => ({
              ...results,
              [id]:
                (adapters.tables?.tables[id]?.rows?.map((row) => [
                  row[x] as number,
                  row[y] as number,
                ]) as Array<[number, number]>) || [],
            }),
            {}
          ),
          isLoading: false,
        },
  getAttributes: (dataView, formulaApi): TypedLensByValueInput['attributes'] => {
    return {
      references: [
        {
          id: dataView.id!,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        ...LENS_LAYERS.map(({ id }) => ({
          id: dataView.id!,
          name: `indexpattern-datasource-layer-${id}`,
          type: 'index-pattern',
        })),
      ],
      state: {
        datasourceStates: {
          formBased: {
            layers: LENS_LAYERS.reduce(
              (results, { id, x, y, formula }) => ({
                ...results,
                [id]: formulaApi.insertOrReplaceFormulaColumn(
                  y,
                  {
                    formula,
                  },
                  {
                    columnOrder: [],
                    columns: {
                      [x]: {
                        dataType: 'date',
                        isBucketed: false,
                        label: 'Timestamp',
                        operationType: 'date_histogram',
                        params: { includeEmptyRows: true, interval: 'auto' },
                        scale: 'ordinal',
                        sourceField: dataView?.timeFieldName!,
                      } as DateHistogramIndexPatternColumn,
                    },
                  },
                  dataView!
                )!,
              }),
              {}
            ),
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
          curveType: 'CURVE_MONOTONE_X',
          fittingFunction: 'None',
          gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
          layers: LENS_LAYERS.map(({ id, x, y }) => ({
            accessors: [y],
            layerId: [id],
            layerType: 'data',
            seriesType: 'area',
            xAccessor: x,
            yConfig: [
              {
                forAccessor: y,
              },
            ],
          })),
          legend: { isVisible: false },
          preferredSeriesType: 'area',
          valueLabels: 'hide',
        },
      },
      title: '',
      visualizationType: 'lnsXY',
    };
  },
  getDataViewQuery: (props) => props.dataViewQuery,
  initialValues,
});
