/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LegendItemListener,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Position,
  ProjectionClickListener,
  RectAnnotation,
  ScaleType,
  Settings,
  XYBrushEvent,
  YDomainRange,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiIcon,
  EuiLink,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { orderBy } from 'lodash';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import {
  ChangePoint,
  WindowParameters,
} from '../../../../common/correlations/change_point/types';
import { useAnnotationsContext } from '../../../context/annotations/use_annotations_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useChartPointerEventContext } from '../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useChangePointDetection } from '../../../components/app/correlations/use_change_point_detection';
import { useTheme } from '../../../hooks/use_theme';
import { unit } from '../../../utils/style';
import { ChartContainer } from './chart_container';
import { getChartAnomalyTimeseries } from './helper/get_chart_anomaly_timeseries';
import { isTimeseriesEmpty, onBrushEnd } from './helper/helper';
import { getTimeZone } from './helper/timezone';

import { CorrelationsTable } from '../../../components/app/correlations/correlations_table';
import { getFailedTransactionsCorrelationImpactLabel } from '../../../components/app/correlations/utils/get_failed_transactions_correlation_impact_label';
import { ImpactBar } from '../impact_bar';
import { createHref, push } from '../Links/url_helpers';

import { MlBrush } from './brush';

interface Props {
  id: string;
  fetchStatus: FETCH_STATUS;
  height?: number;
  onToggleLegend?: LegendItemListener;
  timeseries: Array<TimeSeries<Coordinate>>;
  /**
   * Formatter for y-axis tick values
   */
  yLabelFormat: (y: number) => string;
  /**
   * Formatter for legend and tooltip values
   */
  yTickFormat?: (y: number) => string;
  showAnnotations?: boolean;
  yDomain?: YDomainRange;
  anomalyTimeseries?: ServiceAnomalyTimeseries;
  customTheme?: Record<string, unknown>;
}
export function TimeseriesChart({
  id,
  height = unit * 16,
  fetchStatus,
  onToggleLegend,
  timeseries,
  yLabelFormat,
  yTickFormat,
  showAnnotations = true,
  yDomain,
  anomalyTimeseries,
  customTheme = {},
}: Props) {
  const history = useHistory();
  const { core } = useApmPluginContext();
  const { annotations } = useAnnotationsContext();
  const { setPointerEvent, chartRef } = useChartPointerEventContext();
  const theme = useTheme();
  const chartTheme = useChartTheme();

  const xValues = timeseries.flatMap(({ data }) => data.map(({ x }) => x));

  const timeZone = getTimeZone(core.uiSettings);

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);

  const anomalyChartTimeseries = getChartAnomalyTimeseries({
    anomalyTimeseries,
    theme,
  });

  const xFormatter = niceTimeFormatter([min, max]);
  const isEmpty = isTimeseriesEmpty(timeseries);
  const annotationColor = theme.eui.euiColorSuccess;
  const allSeries = [
    ...timeseries,
    // TODO: re-enable anomaly boundaries when we have a fix for https://github.com/elastic/kibana/issues/100660
    // ...(anomalyChartTimeseries?.boundaries ?? []),
    ...(anomalyChartTimeseries?.scores ?? []),
  ];
  const xDomain = isEmpty ? { min: 0, max: 1 } : { min, max };

  const [originalWindowParameters, setOriginalWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [windowParameters, setWindowParameters] = useState<
    WindowParameters | undefined
  >();

  /*
   * Given a point in time (e.g. where a user clicks), use simple heuristics to compute:
   *
   * 1. The time window around the click to evaluate for changes
   * 2. The historical time window prior to the click to use as a baseline.
   *
   * The philosophy here is that charts are displayed with different granularities according to their
   * overall time window. We select the change point and historical time windows inline with the
   * overall time window.
   *
   * The algorithm for doing this is based on the typical granularities that exist in machine data.
   *
   * :param clickTime
   * :param minTime
   * :param maxTime
   * :return: { baseline_min, baseline_max, deviation_min, deviation_max }
   */
  const getWindowParameters = (
    clickTime: number,
    minTime: number,
    maxTime: number
  ): WindowParameters => {
    const totalWindow = maxTime - minTime;

    // min deviation window
    const minDeviationWindow = 10 * 60 * 1000; // 10min
    const minBaselineWindow = 30 * 60 * 1000; // 30min
    const minWindowGap = 5 * 60 * 1000; // 5min

    // work out bounds
    const deviationWindow = Math.max(totalWindow / 10, minDeviationWindow);
    const baselineWindow = Math.max(totalWindow / 3.5, minBaselineWindow);
    const windowGap = Math.max(totalWindow / 10, minWindowGap);

    const deviationMin = clickTime - deviationWindow / 2;
    const deviationMax = clickTime + deviationWindow / 2;

    const baselineMax = deviationMin - windowGap;
    const baselineMin = baselineMax - baselineWindow;

    return {
      baselineMin: Math.round(baselineMin),
      baselineMax: Math.round(baselineMax),
      deviationMin: Math.round(deviationMin),
      deviationMax: Math.round(deviationMax),
    };
  };

  const changePoint: ProjectionClickListener = ({ x }) => {
    if (typeof x === 'number') {
      const wp = getWindowParameters(x, min, max);
      setOriginalWindowParameters(wp);
      setWindowParameters(wp);
    }
  };

  const { progress, response, startFetch } = useChangePointDetection(
    windowParameters ?? {}
  );

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (windowParameters) {
      startFetch();
      setShowModal(true);
    }
  }, [windowParameters, startFetch]);

  const correlationTerms = useMemo(
    () => orderBy(response.changePoints, 'normalizedScore', 'desc'),
    [response.changePoints]
  );

  const showCorrelationsTable =
    progress.isRunning || correlationTerms.length > 0;

  const failedTransactionsCorrelationsColumns: Array<
    EuiBasicTableColumn<ChangePoint>
  > = useMemo(() => {
    const percentageColumns: Array<EuiBasicTableColumn<ChangePoint>> = [
      {
        width: '100px',
        field: 'pValue',
        name: 'p-value',
        render: (pValue: number) => pValue.toPrecision(3),
        sortable: true,
      },
    ];

    return [
      {
        width: '116px',
        field: 'normalizedScore',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.pValueLabel',
              {
                defaultMessage: 'Score',
              }
            )}
          </>
        ),
        align: RIGHT_ALIGNMENT,
        render: (_, { normalizedScore }) => {
          return (
            <>
              <ImpactBar size="m" value={normalizedScore * 100} />
            </>
          );
        },
        sortable: true,
      },
      {
        width: '116px',
        field: 'pValue',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.impactLabel',
              {
                defaultMessage: 'Impact',
              }
            )}
          </>
        ),
        render: (_, { pValue }) => {
          const label = getFailedTransactionsCorrelationImpactLabel(pValue);
          return label ? (
            <EuiBadge color={label.color}>{label.impact}</EuiBadge>
          ) : null;
        },
        sortable: true,
      },
      {
        field: 'fieldName',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldNameLabel',
          { defaultMessage: 'Field name' }
        ),
        sortable: true,
      },
      {
        field: 'fieldValue',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (_, { fieldValue }) => String(fieldValue).slice(0, 50),
        sortable: true,
      },
      ...percentageColumns,
      {
        width: '100px',
        actions: [
          {
            name: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterLabel',
              { defaultMessage: 'Filter' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterDescription',
              { defaultMessage: 'Filter by value' }
            ),
            icon: 'plusInCircle',
            type: 'icon',
            onClick: (term: ChangePoint) => {
              push(history, {
                query: {
                  kuery: `${term.fieldName}:"${term.fieldValue}"`,
                },
              });
              // onFilter();
              // trackApmEvent({ metric: 'correlations_term_include_filter' });
            },
          },
          {
            name: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeLabel',
              { defaultMessage: 'Exclude' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeDescription',
              { defaultMessage: 'Filter out value' }
            ),
            icon: 'minusInCircle',
            type: 'icon',
            onClick: (term: ChangePoint) => {
              push(history, {
                query: {
                  kuery: `not ${term.fieldName}:"${term.fieldValue}"`,
                },
              });
              // onFilter();
              // trackApmEvent({ metric: 'correlations_term_exclude_filter' });
            },
          },
        ],
        name: i18n.translate(
          'xpack.apm.correlations.correlationsTable.actionsLabel',
          { defaultMessage: 'Filter' }
        ),
        render: (_, { fieldName, fieldValue }) => {
          return (
            <>
              <EuiLink
                href={createHref(history, {
                  query: {
                    kuery: `${fieldName}:"${fieldValue}"`,
                  },
                })}
              >
                <EuiIcon type="magnifyWithPlus" />
              </EuiLink>
              &nbsp;/&nbsp;
              <EuiLink
                href={createHref(history, {
                  query: {
                    kuery: `not ${fieldName}:"${fieldValue}"`,
                  },
                })}
              >
                <EuiIcon type="magnifyWithMinus" />
              </EuiLink>
            </>
          );
        },
      },
    ] as Array<EuiBasicTableColumn<ChangePoint>>;
  }, [history]);

  function onWindowParametersChange(wp: WindowParameters) {
    setWindowParameters(wp);
  }

  const chart = (
    <>
      {originalWindowParameters && (
        <MlBrush
          windowParameters={originalWindowParameters}
          min={min}
          max={max}
          onChange={onWindowParametersChange}
        />
      )}
      <ChartContainer
        hasData={!isEmpty}
        height={height}
        status={fetchStatus}
        id={id}
      >
        <Chart ref={chartRef} id={id}>
          <Settings
            debugState={true}
            tooltip={{ stickTo: 'top', showNullValues: true }}
            onBrushEnd={(event) =>
              onBrushEnd({ x: (event as XYBrushEvent).x, history })
            }
            theme={[
              customTheme,
              {
                areaSeriesStyle: {
                  line: { visible: false },
                },
              },
              ...chartTheme,
            ]}
            onPointerUpdate={setPointerEvent}
            externalPointerEvents={{
              tooltip: { visible: true },
            }}
            showLegend
            legendPosition={Position.Bottom}
            xDomain={xDomain}
            onLegendItemClick={(legend) => {
              if (onToggleLegend) {
                onToggleLegend(legend);
              }
            }}
            onProjectionClick={changePoint}
          />
          <Axis
            id="x-axis"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={xFormatter}
            gridLine={{ visible: false }}
          />
          <Axis
            domain={yDomain}
            id="y-axis"
            ticks={3}
            position={Position.Left}
            tickFormat={yTickFormat ? yTickFormat : yLabelFormat}
            labelFormat={yLabelFormat}
          />

          {showAnnotations && (
            <LineAnnotation
              id="annotations"
              domainType={AnnotationDomainType.XDomain}
              dataValues={annotations.map((annotation) => ({
                dataValue: annotation['@timestamp'],
                header: asAbsoluteDateTime(annotation['@timestamp']),
                details: `${i18n.translate(
                  'xpack.apm.chart.annotation.version',
                  {
                    defaultMessage: 'Version',
                  }
                )} ${annotation.text}`,
              }))}
              style={{
                line: { strokeWidth: 1, stroke: annotationColor, opacity: 1 },
              }}
              marker={<EuiIcon type="dot" color={annotationColor} />}
              markerPosition={Position.Top}
            />
          )}

          {windowParameters && (
            <>
              <RectAnnotation
                dataValues={[
                  {
                    coordinates: {
                      x0: windowParameters.baselineMin,
                      x1: windowParameters.baselineMax,
                      y0: 0,
                      y1: 1000000000,
                    },
                    details: 'baseline',
                  },
                ]}
                id="rect_annotation_1"
                style={{
                  strokeWidth: 1,
                  stroke: '#e8eaeb',
                  fill: '#e8eaeb',
                  opacity: 1,
                }}
                hideTooltips={true}
              />
              <RectAnnotation
                dataValues={[
                  {
                    coordinates: {
                      x0: windowParameters.deviationMin,
                      x1: windowParameters.deviationMax,
                      y0: 0,
                      y1: 1000000000,
                    },
                    details: 'deviation',
                  },
                ]}
                id="rect_annotation_w"
                style={{
                  strokeWidth: 1,
                  stroke: '#e8eaeb',
                  fill: '#e8eaeb',
                  opacity: 1,
                }}
                hideTooltips={true}
              />
            </>
          )}

          {allSeries.map((serie) => {
            const Series = serie.type === 'area' ? AreaSeries : LineSeries;

            return (
              <Series
                timeZone={timeZone}
                key={serie.title}
                id={serie.id || serie.title}
                groupId={serie.groupId}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={serie.yAccessors ?? ['y']}
                y0Accessors={serie.y0Accessors}
                stackAccessors={serie.stackAccessors ?? undefined}
                markSizeAccessor={serie.markSizeAccessor}
                data={isEmpty ? [] : serie.data}
                color={serie.color}
                curve={CurveType.CURVE_MONOTONE_X}
                hideInLegend={serie.hideLegend}
                fit={serie.fit ?? undefined}
                filterSeriesInTooltip={
                  serie.hideTooltipValue ? () => false : undefined
                }
                areaSeriesStyle={serie.areaSeriesStyle}
                lineSeriesStyle={serie.lineSeriesStyle}
              />
            );
          })}
        </Chart>
      </ChartContainer>
      <div data-test-subj="apmCorrelationsTable">
        {showCorrelationsTable && showModal && windowParameters && (
          <CorrelationsTable<ChangePoint>
            columns={failedTransactionsCorrelationsColumns}
            setSelectedSignificantTerm={() => {}}
            onTableChange={() => {}}
            significantTerms={correlationTerms}
            status={
              progress.isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS
            }
          />
        )}
      </div>
    </>
  );

  if (!showModal) return chart;

  function closeModalHandler() {
    setShowModal(false);
    setWindowParameters(undefined);
  }

  return (
    <EuiFlyout onClose={closeModalHandler} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Change point</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{chart}</EuiFlyoutBody>
    </EuiFlyout>
  );
}
