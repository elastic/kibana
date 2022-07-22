/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Chart,
  ESFixedIntervalUnit,
  Heatmap,
  HeatmapBandsColorScale,
  niceTimeFormatter,
  ScaleType,
  TickFormatter,
} from '@elastic/charts';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy, keyBy, map, mapValues } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getSeverityColor } from '../../../../common/anomaly_detection';
import { APMAnomalyTimeseries } from '../../../../common/anomaly_detection/apm_anomaly_timeseries';
import {
  ApmMlDetectorType,
  getAnomalyDetectorLabel,
} from '../../../../common/anomaly_detection/apm_ml_detectors';
import { NodeType } from '../../../../common/connections';
import { ANOMALY_THRESHOLD } from '../../../../common/ml_constants';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { getAgentIcon } from '../../shared/agent_icon/get_agent_icon';
import { ChartContainer } from '../../shared/charts/chart_container';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../shared/charts/helper/get_timeseries_color';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import { ApmDatePicker } from '../../shared/date_picker/apm_date_picker';
import { push } from '../../shared/links/url_helpers';
import { getSpanIcon } from '../../shared/span_icon/get_span_icon';
import { getComparisonEnabled } from '../../shared/time_comparison/get_comparison_enabled';
import { TimeRangeComparisonEnum } from '../../shared/time_comparison/get_comparison_options';

function ChartWithTitle({
  id,
  title,
  color,
  coordinates,
  anomalyTimeseries,
  fetchStatus = FETCH_STATUS.SUCCESS,
  yLabelFormat,
}: {
  id: string;
  title: string;
  color: string;
  coordinates: Array<{ x: number; y: number | null }>;
  anomalyTimeseries?: APMAnomalyTimeseries;
  fetchStatus: FETCH_STATUS;
  yLabelFormat: (y: number) => string;
}) {
  return (
    <EuiPanel hasBorder>
      <EuiTitle size="xs">
        <h2>{title}</h2>
      </EuiTitle>
      <TimeseriesChart
        fetchStatus={fetchStatus}
        id={id}
        timeseries={[{ color, data: coordinates, title, type: 'linemark' }]}
        anomalyTimeseries={anomalyTimeseries}
        yLabelFormat={yLabelFormat}
        anomalyThreshold={ANOMALY_THRESHOLD.LOW}
        comparisonEnabled
        offset={TimeRangeComparisonEnum.ExpectedBounds}
      />
    </EuiPanel>
  );
}

function AnomalyChart({
  anomalySeries,
  status,
  colorScale,
  xScale,
  timeFormatter,
  rows,
}: {
  anomalySeries: Array<{ x: number; value: number | null | undefined }>;
  status: FETCH_STATUS;
  colorScale: HeatmapBandsColorScale;
  xScale: Required<React.ComponentProps<typeof Heatmap>>['xScale'];
  timeFormatter: TickFormatter;
  rows: number;
}) {
  return (
    <ChartContainer
      hasData={anomalySeries.length > 0}
      status={status}
      height={rows * 32}
    >
      <Chart>
        <Heatmap
          id="tx_metrics"
          colorScale={colorScale}
          data={anomalySeries}
          xAccessor="x"
          yAccessor="label"
          valueAccessor="value"
          xAxisLabelFormatter={timeFormatter}
          xScale={xScale}
        />
      </Chart>
    </ChartContainer>
  );
}

export function TimelineView() {
  const {
    query: {
      serviceName = '',
      rangeFrom,
      rangeTo,
      environment,
      refreshInterval,
      refreshPaused,
    },
  } = useApmParams('/timeline');

  const { core } = useApmPluginContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const history = useHistory();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!serviceName) {
        return Promise.resolve<
          APIReturnType<'GET /internal/apm/timeline/charts'>
        >({
          anomalySeries: [],
          spanMetricsSeries: {},
          transactionMetrics: [],
          intervalString: '60s',
          destinationMap: {},
        });
      }

      return callApmApi('GET /internal/apm/timeline/charts', {
        params: {
          query: {
            serviceName,
            start,
            end,
            environment,
          },
        },
      });
    },
    [start, end, environment, serviceName]
  );

  const router = useApmRouter();

  const { darkMode } = useTheme();

  const comparisonEnabled = getComparisonEnabled({
    core,
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const formattedDestinations = mapValues(data?.destinationMap, (node, key) => {
    if (node.type === NodeType.dependency) {
      return {
        label: node.dependencyName,
        icon: getSpanIcon(node.spanType, node.spanSubtype),
        link: router.link('/dependencies/overview', {
          query: {
            dependencyName: node.dependencyName,
            comparisonEnabled,
            environment,
            rangeTo,
            rangeFrom,
            kuery: '',
            refreshInterval,
            refreshPaused,
          },
        }),
      };
    }

    return {
      label: node.serviceName,
      icon: getAgentIcon(node.agentName, darkMode),
      link: router.link('/services/{serviceName}/overview', {
        path: {
          serviceName: node.serviceName,
        },
        query: {
          comparisonEnabled,
          environment,
          rangeTo,
          rangeFrom,
          kuery: '',
          refreshInterval,
          refreshPaused,
          serviceGroup: '',
        },
      }),
    };
  });

  const serviceOptions = serviceName
    ? [{ label: serviceName, value: serviceName }]
    : [];

  const transactionAnomalySeries =
    data?.anomalySeries
      .filter(
        (series) =>
          series.type === ApmMlDetectorType.txThroughput ||
          series.type === ApmMlDetectorType.txLatency ||
          series.type === ApmMlDetectorType.txFailureRate
      )
      .flatMap((series) =>
        series.anomalies.map((coordinate) => ({
          x: coordinate.x,
          value: coordinate.y,
          type: series.type,
          label: getAnomalyDetectorLabel(series.type),
        }))
      ) ?? [];

  const spanAnomalySeries = groupBy(
    data?.anomalySeries
      .filter(
        (series) =>
          series.type === ApmMlDetectorType.spanThroughput ||
          series.type === ApmMlDetectorType.spanLatency ||
          series.type === ApmMlDetectorType.spanFailureRate
      )
      .map((series) => {
        return {
          destination: series.byFieldValue,
          values: series.anomalies.map((coordinate) => ({
            x: coordinate.x,
            value: coordinate.y,
            type: series.type,
            label: getAnomalyDetectorLabel(series.type),
          })),
        };
      }) ?? [],
    'destination'
  );

  const timeFormatter = useMemo(
    () =>
      niceTimeFormatter([new Date(start).getTime(), new Date(end).getTime()]),
    [start, end]
  );

  const xScale = useMemo(() => {
    const [, value, unit] = (data?.intervalString ?? '60s').match(
      /(.*)([a-z])$/
    )!;

    return {
      type: ScaleType.Time,
      interval: {
        type: 'fixed' as const,
        value: Number(value),
        unit: unit as ESFixedIntervalUnit,
      },
    };
  }, [data?.intervalString]);

  const scale: HeatmapBandsColorScale = {
    bands: [
      {
        color: getSeverityColor(ANOMALY_THRESHOLD.LOW),
        start: 0,
        end: ANOMALY_THRESHOLD.WARNING,
      },
      {
        color: getSeverityColor(ANOMALY_THRESHOLD.WARNING),
        start: ANOMALY_THRESHOLD.WARNING,
        end: ANOMALY_THRESHOLD.MINOR,
      },
      {
        color: getSeverityColor(ANOMALY_THRESHOLD.MINOR),
        start: ANOMALY_THRESHOLD.MINOR,
        end: ANOMALY_THRESHOLD.MAJOR,
      },
      {
        color: getSeverityColor(ANOMALY_THRESHOLD.MAJOR),
        start: ANOMALY_THRESHOLD.MAJOR,
        end: ANOMALY_THRESHOLD.CRITICAL,
      },
      {
        color: getSeverityColor(ANOMALY_THRESHOLD.CRITICAL),
        start: ANOMALY_THRESHOLD.CRITICAL,
        end: 100,
      },
    ],
    type: 'bands',
  };

  return (
    <ApmMainTemplate
      pageTitle={i18n.translate('xpack.apm.timelineView.pageTitle', {
        defaultMessage: 'Timeline',
      })}
      environmentFilter
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow>
              <EuiComboBox
                fullWidth
                placeholder={i18n.translate(
                  'xpack.apm.timelineView.serviceNameSelectPlaceholder',
                  { defaultMessage: 'Select services' }
                )}
                singleSelection
                selectedOptions={serviceOptions}
                onChange={(options) => {
                  push(history, {
                    query: {
                      serviceName: options[0]?.value ?? '',
                    },
                  });
                }}
                onCreateOption={(option) => {
                  push(history, {
                    query: {
                      serviceName: option || '',
                    },
                  });
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ApmDatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <ChartPointerEventContextProvider>
            <EuiFlexGroup direction="column" gutterSize="xl">
              <EuiFlexItem>
                <AnomalyChart
                  anomalySeries={transactionAnomalySeries}
                  colorScale={scale}
                  timeFormatter={timeFormatter}
                  status={status}
                  xScale={xScale}
                  rows={3}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGrid columns={3}>
                  <EuiFlexItem>
                    <ChartWithTitle
                      id="txLatency"
                      fetchStatus={status}
                      title={i18n.translate(
                        'xpack.apm.timelineView.chartsTitleTransactionLatency',
                        { defaultMessage: 'Transaction latency' }
                      )}
                      yLabelFormat={asDuration}
                      coordinates={
                        data?.transactionMetrics.map((coord) => ({
                          x: coord.x,
                          y: coord.transactionLatency,
                        })) ?? []
                      }
                      color={
                        getTimeSeriesColor(ChartType.LATENCY_AVG)
                          .currentPeriodColor
                      }
                      anomalyTimeseries={data?.anomalySeries.find(
                        (series) => series.type === ApmMlDetectorType.txLatency
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ChartWithTitle
                      id="txThroughput"
                      fetchStatus={status}
                      title={i18n.translate(
                        'xpack.apm.timelineView.chartsTitleTransactionThroughput',
                        { defaultMessage: 'Transaction throughput' }
                      )}
                      yLabelFormat={asTransactionRate}
                      coordinates={
                        data?.transactionMetrics.map((coord) => ({
                          x: coord.x,
                          y: coord.transactionRate,
                        })) ?? []
                      }
                      color={
                        getTimeSeriesColor(ChartType.THROUGHPUT)
                          .currentPeriodColor
                      }
                      anomalyTimeseries={data?.anomalySeries.find(
                        (series) =>
                          series.type === ApmMlDetectorType.txThroughput
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ChartWithTitle
                      id="txFailureRate"
                      fetchStatus={status}
                      title={i18n.translate(
                        'xpack.apm.timelineView.chartsTitleTransactionFailureRate',
                        { defaultMessage: 'Transaction failure rate' }
                      )}
                      yLabelFormat={(y) => asPercent(y, 1)}
                      coordinates={
                        data?.transactionMetrics.map((coord) => ({
                          x: coord.x,
                          y: coord.transactionFailureRate,
                        })) ?? []
                      }
                      color={
                        getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE)
                          .currentPeriodColor
                      }
                      anomalyTimeseries={data?.anomalySeries.find(
                        (series) =>
                          series.type === ApmMlDetectorType.txFailureRate
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGrid>
              </EuiFlexItem>
              {map(data?.spanMetricsSeries ?? {}, (series, destination) => (
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="m" direction="column">
                    <EuiFlexItem>
                      <EuiFlexGroup direction="row" gutterSize="m">
                        <EuiFlexItem grow={false}>
                          {formattedDestinations[destination] ? (
                            <EuiLink
                              href={formattedDestinations[destination].link}
                            >
                              <EuiFlexGroup
                                direction="row"
                                gutterSize="s"
                                alignItems="center"
                              >
                                <EuiFlexItem grow={false}>
                                  <EuiIcon
                                    type={
                                      formattedDestinations[destination].icon
                                    }
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiTitle size="s">
                                    <h3>
                                      {formattedDestinations[destination].label}
                                    </h3>
                                  </EuiTitle>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiLink>
                          ) : (
                            <EuiTitle size="s">
                              <h3>{destination}</h3>
                            </EuiTitle>
                          )}
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType={
                              collapsed[destination] ? 'expand' : 'minimize'
                            }
                            onClick={() =>
                              setCollapsed((prevCollapsed) => ({
                                ...prevCollapsed,
                                [destination]: !prevCollapsed[destination],
                              }))
                            }
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    {!collapsed[destination] && (
                      <>
                        <EuiFlexItem>
                          <AnomalyChart
                            anomalySeries={Object.values(
                              spanAnomalySeries[destination]
                            ).flatMap((anomalySeries) => anomalySeries.values)}
                            colorScale={scale}
                            timeFormatter={timeFormatter}
                            status={status}
                            xScale={xScale}
                            rows={3}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiFlexGrid columns={3}>
                            <EuiFlexItem>
                              <ChartWithTitle
                                id={`spanLatency-${destination}`}
                                fetchStatus={status}
                                title={i18n.translate(
                                  'xpack.apm.timelineView.chartsTitleSpanLatency',
                                  { defaultMessage: 'Span latency' }
                                )}
                                yLabelFormat={asDuration}
                                coordinates={
                                  series.map((coord) => ({
                                    x: coord.x,
                                    y: coord.spanLatency,
                                  })) ?? []
                                }
                                color={
                                  getTimeSeriesColor(ChartType.LATENCY_AVG)
                                    .currentPeriodColor
                                }
                                anomalyTimeseries={data?.anomalySeries.find(
                                  (singleAnomalySeries) =>
                                    singleAnomalySeries.type ===
                                      ApmMlDetectorType.spanLatency &&
                                    singleAnomalySeries.byFieldValue ===
                                      destination
                                )}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <ChartWithTitle
                                id={`spanThroughput-${destination}`}
                                fetchStatus={status}
                                title={i18n.translate(
                                  'xpack.apm.timelineView.chartsTitleSpanThroughput',
                                  { defaultMessage: 'Span throughput' }
                                )}
                                yLabelFormat={asTransactionRate}
                                coordinates={
                                  series.map((coord) => ({
                                    x: coord.x,
                                    y: coord.spanRate,
                                  })) ?? []
                                }
                                color={
                                  getTimeSeriesColor(ChartType.THROUGHPUT)
                                    .currentPeriodColor
                                }
                                anomalyTimeseries={data?.anomalySeries.find(
                                  (singleAnomalySeries) =>
                                    singleAnomalySeries.type ===
                                      ApmMlDetectorType.spanThroughput &&
                                    singleAnomalySeries.byFieldValue ===
                                      destination
                                )}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <ChartWithTitle
                                id={`spanFailureRate-${destination}`}
                                fetchStatus={status}
                                title={i18n.translate(
                                  'xpack.apm.timelineView.chartsTitleSpanFailureRate',
                                  { defaultMessage: 'Span failure rate' }
                                )}
                                yLabelFormat={(value) => asPercent(value, 1)}
                                coordinates={
                                  series.map((coord) => ({
                                    x: coord.x,
                                    y: coord.spanFailureRate,
                                  })) ?? []
                                }
                                color={
                                  getTimeSeriesColor(ChartType.THROUGHPUT)
                                    .currentPeriodColor
                                }
                                anomalyTimeseries={data?.anomalySeries.find(
                                  (singleAnomalySeries) =>
                                    singleAnomalySeries.type ===
                                      ApmMlDetectorType.spanFailureRate &&
                                    singleAnomalySeries.byFieldValue ===
                                      destination
                                )}
                              />
                            </EuiFlexItem>
                          </EuiFlexGrid>
                        </EuiFlexItem>
                      </>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </ChartPointerEventContextProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ApmMainTemplate>
  );
}
