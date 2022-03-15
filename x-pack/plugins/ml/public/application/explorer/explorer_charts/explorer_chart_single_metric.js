/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a chart of anomalies in the raw data in
 * the Machine Learning Explorer dashboard.
 */

import PropTypes from 'prop-types';
import React from 'react';

import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

import { formatHumanReadableDateTime } from '../../../../common/util/date_utils';
import { formatValue } from '../../formatters/format_value';
import {
  getFormattedSeverityScore,
  getSeverityColor,
  getSeverityWithLow,
  getMultiBucketImpactLabel,
} from '../../../../common/util/anomaly_utils';
import {
  LINE_CHART_ANOMALY_RADIUS,
  MULTI_BUCKET_SYMBOL_SIZE,
  SCHEDULED_EVENT_SYMBOL_HEIGHT,
  drawLineChartDots,
  getTickValues,
  numTicksForDateFormat,
  removeLabelOverlap,
  showMultiBucketAnomalyMarker,
  showMultiBucketAnomalyTooltip,
} from '../../util/chart_utils';
import { LoadingIndicator } from '../../components/loading_indicator/loading_indicator';
import { mlFieldFormatService } from '../../services/field_format_service';
import { TRANSPARENT_BACKGROUND } from './constants';

const CONTENT_WRAPPER_HEIGHT = 215;
const CONTENT_WRAPPER_CLASS = 'ml-explorer-chart-content-wrapper';

export class ExplorerChartSingleMetric extends React.Component {
  static propTypes = {
    tooManyBuckets: PropTypes.bool,
    seriesConfig: PropTypes.object,
    severity: PropTypes.number.isRequired,
    tooltipService: PropTypes.object.isRequired,
    timeBuckets: PropTypes.object.isRequired,
    onPointerUpdate: PropTypes.func.isRequired,
    chartTheme: PropTypes.object.isRequired,
    cursor: PropTypes.object.isRequired,
  };

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.renderChart();
  }

  renderChart() {
    const {
      tooManyBuckets,
      tooltipService,
      timeBuckets,
      showSelectedInterval,
      onPointerUpdate,
      chartTheme,
      cursor,
    } = this.props;

    const element = this.rootNode;
    const config = this.props.seriesConfig;
    const severity = this.props.severity;

    if (typeof config === 'undefined' || Array.isArray(config.chartData) === false) {
      // just return so the empty directive renders without an error later on
      return;
    }

    const fieldFormat = mlFieldFormatService.getFieldFormat(config.jobId, config.detectorIndex);

    let vizWidth = 0;
    const chartHeight = 170;

    // Left margin is adjusted later for longest y-axis label.
    const margin = { top: 10, right: 0, bottom: 30, left: 60 };

    let lineChartXScale = null;
    let lineChartYScale = null;
    let lineChartGroup;
    let lineChartValuesLine = null;

    init(config.chartLimits);
    drawLineChart(config.chartData);

    function init(chartLimits) {
      const $el = $('.ml-explorer-chart');

      // Clear any existing elements from the visualization,
      // then build the svg elements for the chart.
      const chartElement = d3.select(element).select(`.${CONTENT_WRAPPER_CLASS}`);
      chartElement.select('svg').remove();

      const svgWidth = $el.width();
      const svgHeight = chartHeight + margin.top + margin.bottom;

      const svg = chartElement
        .append('svg')
        .classed('ml-explorer-chart-svg', true)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

      // Set the size of the left margin according to the width of the largest y axis tick label.
      lineChartYScale = d3.scale
        .linear()
        .range([chartHeight, 0])
        .domain([chartLimits.min, chartLimits.max])
        .nice();

      const yAxis = d3.svg
        .axis()
        .scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      let maxYAxisLabelWidth = 0;
      const tempLabelText = svg.append('g').attr('class', 'temp-axis-label tick');
      tempLabelText
        .selectAll('text.temp.axis')
        .data(lineChartYScale.ticks())
        .enter()
        .append('text')
        .text((d) => {
          if (fieldFormat !== undefined) {
            return fieldFormat.convert(d, 'text');
          } else {
            return lineChartYScale.tickFormat()(d);
          }
        })
        // Don't use an arrow function since we need access to `this`.
        .each(function () {
          maxYAxisLabelWidth = Math.max(
            this.getBBox().width + yAxis.tickPadding(),
            maxYAxisLabelWidth
          );
        })
        .remove();
      d3.select('.temp-axis-label').remove();

      margin.left = Math.max(maxYAxisLabelWidth, 40);
      vizWidth = svgWidth - margin.left - margin.right;

      // Set the x axis domain to match the request plot range.
      // This ensures ranges on different charts will match, even when there aren't
      // data points across the full range, and the selected anomalous region is centred.
      lineChartXScale = d3.time
        .scale()
        .range([0, vizWidth])
        .domain([config.plotEarliest, config.plotLatest]);

      lineChartValuesLine = d3.svg
        .line()
        .x((d) => lineChartXScale(d.date))
        .y((d) => lineChartYScale(d.value))
        .defined((d) => d.value !== null);

      lineChartGroup = svg
        .append('g')
        .attr('class', 'line-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    function drawLineChart(data) {
      // Add border round plot area.
      lineChartGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', vizWidth)
        .style('stroke', '#cccccc')
        .style('fill', 'none')
        .style('stroke-width', 1);

      drawLineChartAxes();
      drawLineChartHighlightedSpan();
      drawSyncedCursorLine(lineChartGroup);
      drawLineChartPaths(data);
      drawLineChartDots(data, lineChartGroup, lineChartValuesLine);
      drawLineChartMarkers(data);
    }

    function drawSyncedCursorLine(lineChartGroup) {
      lineChartGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', vizWidth)
        .on('mouseout', function () {
          onPointerUpdate({
            chartId: 'ml-anomaly-chart-metric',
            scale: 'time',
            smHorizontalValue: null,
            smVerticalValue: null,
            type: 'Out',
            unit: undefined,
          });
        })
        .on('mousemove', function () {
          const mouse = d3.mouse(this);

          if (onPointerUpdate) {
            onPointerUpdate({
              chartId: 'ml-anomaly-chart-metric',
              scale: 'time',
              smHorizontalValue: null,
              smVerticalValue: null,
              type: 'Over',
              unit: undefined,
              x: moment(lineChartXScale.invert(mouse[0])).unix() * 1000,
            });
          }
        })
        .style('fill', TRANSPARENT_BACKGROUND);

      const cursorData =
        cursor &&
        cursor.type === 'Over' &&
        cursor.x >= config.plotEarliest &&
        cursor.x <= config.plotLatest
          ? [cursor.x]
          : [];

      const cursorMouseLine = lineChartGroup
        .append('g')
        .attr('class', 'ml-anomaly-chart-cursor')
        .selectAll('.ml-anomaly-chart-cursor-line')
        .data(cursorData);

      cursorMouseLine
        .enter()
        .append('path')
        .attr('class', 'ml-anomaly-chart-cursor-line')
        .attr('d', (ts) => {
          const xPosition = lineChartXScale(ts);
          return `M${xPosition},${chartHeight} ${xPosition},0`;
        })
        // Use elastic chart's cursor line style if possible
        .style('stroke', `${chartTheme.crosshair.line.stroke ?? 'black'}`)
        .style('stroke-width', `${chartTheme.crosshair.line.strokeWidth ?? '1'}px`)
        .style('stroke-dasharray', chartTheme.crosshair.line.dash ?? '4,4');

      cursorMouseLine.exit().remove();
    }

    function drawLineChartAxes() {
      // Get the scaled date format to use for x axis tick labels.
      const bounds = { min: moment(config.plotEarliest), max: moment(config.plotLatest) };
      timeBuckets.setBounds(bounds);
      timeBuckets.setInterval('auto');
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      const tickValuesStart = Math.max(config.selectedEarliest, config.plotEarliest);
      // +1 ms to account for the ms that was subtracted for query aggregations.
      const interval = config.selectedLatest - config.selectedEarliest + 1;

      const xAxis = d3.svg
        .axis()
        .scale(lineChartXScale)
        .orient('bottom')
        .innerTickSize(-chartHeight)
        .outerTickSize(0)
        .tickPadding(10)
        .tickFormat((d) => moment(d).format(xAxisTickFormat));

      // With tooManyBuckets, or when the chart is used as an embeddable,
      // the chart would end up with no x-axis labels because the ticks are based on the span of the
      // emphasis section, and the selected area spans the whole chart.
      const useAutoTicks =
        tooManyBuckets === true || interval >= config.plotLatest - config.plotEarliest;
      if (useAutoTicks === false) {
        const tickValues = getTickValues(
          tickValuesStart,
          interval,
          config.plotEarliest,
          config.plotLatest
        );
        xAxis.tickValues(tickValues);
      } else {
        xAxis.ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat));
      }

      const yAxis = d3.svg
        .axis()
        .scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      if (fieldFormat !== undefined) {
        yAxis.tickFormat((d) => fieldFormat.convert(d, 'text'));
      }

      const axes = lineChartGroup.append('g');

      const gAxis = axes
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + chartHeight + ')')
        .call(xAxis);

      axes.append('g').attr('class', 'y axis').call(yAxis);

      if (useAutoTicks === false) {
        removeLabelOverlap(gAxis, tickValuesStart, interval, vizWidth);
      }
    }

    function drawLineChartHighlightedSpan() {
      if (showSelectedInterval === false) return;

      // Draws a rectangle which highlights the time span that has been selected for view.
      // Note depending on the overall time range and the bucket span, the selected time
      // span may be longer than the range actually being plotted.
      const rectStart = Math.max(config.selectedEarliest, config.plotEarliest);
      const rectEnd = Math.min(config.selectedLatest, config.plotLatest);
      const rectWidth = lineChartXScale(rectEnd) - lineChartXScale(rectStart);

      lineChartGroup
        .append('rect')
        .attr('class', 'selected-interval')
        .attr('x', lineChartXScale(new Date(rectStart)) + 2)
        .attr('y', 2)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('width', rectWidth - 4)
        .attr('height', chartHeight - 4);
    }

    function drawLineChartPaths(data) {
      lineChartGroup
        .append('path')
        .attr('class', 'values-line')
        .attr('d', lineChartValuesLine(data));
    }

    function drawLineChartMarkers(data) {
      // Render circle markers for the points.
      // These are used for displaying tooltips on mouseover.
      // Don't render dots where value=null (data gaps, with no anomalies)
      // or for multi-bucket anomalies.
      const dots = lineChartGroup
        .append('g')
        .attr('class', 'chart-markers')
        .selectAll('.metric-value')
        .data(
          data.filter(
            (d) =>
              (d.value !== null || typeof d.anomalyScore === 'number') &&
              !showMultiBucketAnomalyMarker(d)
          )
        );

      // Remove dots that are no longer needed i.e. if number of chart points has decreased.
      dots.exit().remove();
      // Create any new dots that are needed i.e. if number of chart points has increased.
      dots
        .enter()
        .append('circle')
        .attr('r', LINE_CHART_ANOMALY_RADIUS)
        // Don't use an arrow function since we need access to `this`.
        .on('mouseover', function (d) {
          showLineChartTooltip(d, this);
        })
        .on('mouseout', () => tooltipService.hide());

      const isAnomalyVisible = (d) =>
        d.anomalyScore !== undefined && Number(d.anomalyScore) >= severity;

      // Update all dots to new positions.
      dots
        .attr('cx', (d) => lineChartXScale(d.date))
        .attr('cy', (d) => lineChartYScale(d.value))
        .attr('class', (d) => {
          let markerClass = 'metric-value';
          if (isAnomalyVisible(d)) {
            markerClass += ` anomaly-marker ${getSeverityWithLow(d.anomalyScore).id}`;
          }
          return markerClass;
        });

      // Render cross symbols for any multi-bucket anomalies.
      const multiBucketMarkers = lineChartGroup
        .select('.chart-markers')
        .selectAll('.multi-bucket')
        .data(data.filter((d) => isAnomalyVisible(d) && showMultiBucketAnomalyMarker(d) === true));

      // Remove multi-bucket markers that are no longer needed
      multiBucketMarkers.exit().remove();

      // Append the multi-bucket markers and position on chart.
      multiBucketMarkers
        .enter()
        .append('path')
        .attr('d', d3.svg.symbol().size(MULTI_BUCKET_SYMBOL_SIZE).type('cross'))
        .attr(
          'transform',
          (d) => `translate(${lineChartXScale(d.date)}, ${lineChartYScale(d.value)})`
        )
        .attr(
          'class',
          (d) => `anomaly-marker multi-bucket ${getSeverityWithLow(d.anomalyScore).id}`
        )
        // Don't use an arrow function since we need access to `this`.
        .on('mouseover', function (d) {
          showLineChartTooltip(d, this);
        })
        .on('mouseout', () => tooltipService.hide());

      // Add rectangular markers for any scheduled events.
      const scheduledEventMarkers = lineChartGroup
        .select('.chart-markers')
        .selectAll('.scheduled-event-marker')
        .data(data.filter((d) => d.scheduledEvents !== undefined));

      // Remove markers that are no longer needed i.e. if number of chart points has decreased.
      scheduledEventMarkers.exit().remove();
      // Create any new markers that are needed i.e. if number of chart points has increased.
      scheduledEventMarkers
        .enter()
        .append('rect')
        .attr('width', LINE_CHART_ANOMALY_RADIUS * 2)
        .attr('height', SCHEDULED_EVENT_SYMBOL_HEIGHT)
        .attr('class', 'scheduled-event-marker')
        .attr('rx', 1)
        .attr('ry', 1);

      // Update all markers to new positions.
      scheduledEventMarkers
        .attr('x', (d) => lineChartXScale(d.date) - LINE_CHART_ANOMALY_RADIUS)
        .attr('y', (d) => lineChartYScale(d.value) - SCHEDULED_EVENT_SYMBOL_HEIGHT / 2);
    }

    function showLineChartTooltip(marker, circle) {
      // Show the time and metric values in the tooltip.
      // Uses date, value, upper, lower and anomalyScore (optional) marker properties.
      const formattedDate = formatHumanReadableDateTime(marker.date);
      const tooltipData = [{ label: formattedDate }];
      const seriesKey = config.detectorLabel;

      if (marker.anomalyScore !== undefined) {
        const score = parseInt(marker.anomalyScore);
        tooltipData.push({
          label: i18n.translate('xpack.ml.explorer.singleMetricChart.anomalyScoreLabel', {
            defaultMessage: 'anomaly score',
          }),
          value: getFormattedSeverityScore(score),
          color: getSeverityColor(score),
          seriesIdentifier: {
            key: seriesKey,
          },
          valueAccessor: 'anomaly_score',
        });

        if (showMultiBucketAnomalyTooltip(marker) === true) {
          tooltipData.push({
            label: i18n.translate('xpack.ml.explorer.singleMetricChart.multiBucketImpactLabel', {
              defaultMessage: 'multi-bucket impact',
            }),
            value: getMultiBucketImpactLabel(marker.multiBucketImpact),
            seriesIdentifier: {
              key: seriesKey,
            },
            valueAccessor: 'multi_bucket_impact',
          });
        }

        // Show actual/typical when available except for rare detectors.
        // Rare detectors always have 1 as actual and the probability as typical.
        // Exposing those values in the tooltip with actual/typical labels might irritate users.
        if (marker.actual !== undefined && config.functionDescription !== 'rare') {
          // Display the record actual in preference to the chart value, which may be
          // different depending on the aggregation interval of the chart.
          tooltipData.push({
            label: i18n.translate('xpack.ml.explorer.singleMetricChart.actualLabel', {
              defaultMessage: 'actual',
            }),
            value: formatValue(marker.actual, config.functionDescription, fieldFormat),
            seriesIdentifier: {
              key: seriesKey,
            },
            valueAccessor: 'actual',
          });
          tooltipData.push({
            label: i18n.translate('xpack.ml.explorer.singleMetricChart.typicalLabel', {
              defaultMessage: 'typical',
            }),
            value: formatValue(marker.typical, config.functionDescription, fieldFormat),
            seriesIdentifier: {
              key: seriesKey,
            },
            valueAccessor: 'typical',
          });
        } else {
          tooltipData.push({
            label: i18n.translate('xpack.ml.explorer.singleMetricChart.valueLabel', {
              defaultMessage: 'value',
            }),
            value: formatValue(marker.value, config.functionDescription, fieldFormat),
            seriesIdentifier: {
              key: seriesKey,
            },
            valueAccessor: 'value',
          });
          if (marker.byFieldName !== undefined && marker.numberOfCauses !== undefined) {
            tooltipData.push({
              label: i18n.translate(
                'xpack.ml.explorer.distributionChart.unusualByFieldValuesLabel',
                {
                  defaultMessage:
                    '{ numberOfCauses, plural, one {# unusual {byFieldName} value} other {#{plusSign} unusual {byFieldName} values}}',
                  values: {
                    numberOfCauses: marker.numberOfCauses,
                    byFieldName: marker.byFieldName,
                    // Maximum of 10 causes are stored in the record, so '10' may mean more than 10.
                    plusSign: marker.numberOfCauses < 10 ? '' : '+',
                  },
                }
              ),
              seriesIdentifier: {
                key: seriesKey,
              },
              valueAccessor: 'numberOfCauses',
            });
          }
        }
      } else {
        tooltipData.push({
          label: i18n.translate(
            'xpack.ml.explorer.singleMetricChart.valueWithoutAnomalyScoreLabel',
            {
              defaultMessage: 'value',
            }
          ),
          value: formatValue(marker.value, config.functionDescription, fieldFormat),
          seriesIdentifier: {
            key: seriesKey,
          },
          valueAccessor: 'value',
        });
      }

      if (marker.scheduledEvents !== undefined) {
        tooltipData.push({
          label: i18n.translate('xpack.ml.explorer.singleMetricChart.scheduledEventsLabel', {
            defaultMessage: 'Scheduled events',
          }),
          value: marker.scheduledEvents,
          seriesIdentifier: {
            key: seriesKey,
          },
          valueAccessor: 'scheduledEvents',
        });
      }

      tooltipService.show(tooltipData, circle, {
        x: LINE_CHART_ANOMALY_RADIUS * 3,
        y: LINE_CHART_ANOMALY_RADIUS * 2,
      });
    }
  }

  shouldComponentUpdate() {
    // Always return true, d3 will take care of appropriate re-rendering.
    return true;
  }

  setRef(componentNode) {
    this.rootNode = componentNode;
  }

  render() {
    const { seriesConfig } = this.props;

    if (typeof seriesConfig === 'undefined') {
      // just return so the empty directive renders without an error later on
      return null;
    }

    // create a chart loading placeholder
    const isLoading = seriesConfig.loading;

    return (
      <div className="ml-explorer-chart" ref={this.setRef.bind(this)}>
        {isLoading && <LoadingIndicator height={CONTENT_WRAPPER_HEIGHT} />}
        {!isLoading && <div className={CONTENT_WRAPPER_CLASS} />}
      </div>
    );
  }
}
