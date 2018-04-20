/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering a chart of anomalies in the raw data in
 * the Machine Learning Explorer dashboard.
 */

import './styles/explorer_chart_directive.less';

import _ from 'lodash';
import d3 from 'd3';
import angular from 'angular';
import moment from 'moment';

import { getSeverityWithLow } from 'plugins/ml/util/anomaly_utils';
import { drawLineChartDots, numTicksForDateFormat } from 'plugins/ml/util/chart_utils';
import { TimeBucketsProvider } from 'ui/time_buckets';
import 'plugins/ml/filters/format_value';
import loadingIndicatorWrapperTemplate from 'plugins/ml/components/loading_indicator/loading_indicator_wrapper.html';
import { mlEscape } from 'plugins/ml/util/string_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlExplorerChart', function (
  Private,
  formatValueFilter,
  mlChartTooltipService,
  mlSelectSeverityService,
  mlFieldFormatService) {

  function link(scope, element) {
    console.log('ml-explorer-chart directive link series config:', scope.seriesConfig);
    if (typeof scope.seriesConfig === 'undefined') {
      // just return so the empty directive renders without an error later on
      return;
    }
    const config = scope.seriesConfig;
    const fieldFormat = mlFieldFormatService.getFieldFormat(config.jobId, config.detectorIndex);

    let vizWidth = 0;
    const chartHeight = 170;
    const LINE_CHART_ANOMALY_RADIUS = 7;
    const SCHEDULED_EVENT_MARKER_HEIGHT = 5;

    // Left margin is adjusted later for longest y-axis label.
    const margin = { top: 10, right: 0, bottom: 30, left: 60 };

    const TimeBuckets = Private(TimeBucketsProvider);
    let lineChartXScale = null;
    let lineChartYScale = null;
    let lineChartGroup;
    let lineChartValuesLine = null;

    // create a chart loading placeholder
    scope.isLoading = config.loading;
    if (Array.isArray(config.chartData)) {
      // make sure we wait for the previous digest cycle to finish
      // or the chart's wrapping elements might not have their
      // right widths yet and we need them to define the SVG's width
      scope.$evalAsync(() => {
        init(config.chartLimits);
        drawLineChart(config.chartData);
      });
    }

    element.on('$destroy', function () {
      scope.$destroy();
    });

    function init(chartLimits) {
      const $el = angular.element('ml-explorer-chart');

      // Clear any existing elements from the visualization,
      // then build the svg elements for the chart.
      const chartElement = d3.select(element.get(0)).select('.content-wrapper');
      chartElement.select('svg').remove();

      const svgWidth = $el.width();
      const svgHeight = chartHeight + margin.top + margin.bottom;

      const svg = chartElement.append('svg')
        .attr('width',  svgWidth)
        .attr('height', svgHeight);

      // Set the size of the left margin according to the width of the largest y axis tick label.
      lineChartYScale = d3.scale.linear()
        .range([chartHeight, 0])
        .domain([
          chartLimits.min,
          chartLimits.max
        ])
        .nice();

      const yAxis = d3.svg.axis().scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      let maxYAxisLabelWidth = 0;
      const tempLabelText = svg.append('g')
        .attr('class', 'temp-axis-label tick');
      tempLabelText.selectAll('text.temp.axis').data(lineChartYScale.ticks())
        .enter()
        .append('text')
        .text((d) => {
          if (fieldFormat !== undefined) {
            return fieldFormat.convert(d, 'text');
          } else {
            return lineChartYScale.tickFormat()(d);
          }
        })
        .each(function () {
          maxYAxisLabelWidth = Math.max(this.getBBox().width + yAxis.tickPadding(), maxYAxisLabelWidth);
        })
        .remove();
      d3.select('.temp-axis-label').remove();

      margin.left = (Math.max(maxYAxisLabelWidth, 40));
      vizWidth  = svgWidth  - margin.left - margin.right;

      // Set the x axis domain to match the request plot range.
      // This ensures ranges on different charts will match, even when there aren't
      // data points across the full range, and the selected anomalous region is centred.
      lineChartXScale = d3.time.scale()
        .range([0, vizWidth])
        .domain([config.plotEarliest, config.plotLatest]);

      lineChartValuesLine = d3.svg.line()
        .x(d => lineChartXScale(d.date))
        .y(d => lineChartYScale(d.value))
        .defined(d => d.value !== null);

      lineChartGroup = svg.append('g')
        .attr('class', 'line-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    }

    function drawLineChart(data) {
      // Add border round plot area.
      lineChartGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', vizWidth)
        .style('stroke', '#cccccc')
        .style('fill', 'none')
        .style('stroke-width', 1);

      drawLineChartAxes();
      drawLineChartHighlightedSpan();
      drawLineChartPaths(data);
      drawLineChartDots(data, lineChartGroup, lineChartValuesLine);
      drawLineChartMarkers(data);
    }

    function drawLineChartAxes() {
      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new TimeBuckets();
      const bounds = { min: moment(config.plotEarliest), max: moment(config.plotLatest) };
      timeBuckets.setBounds(bounds);
      timeBuckets.setInterval('auto');
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      const xAxis = d3.svg.axis().scale(lineChartXScale)
        .orient('bottom')
        .innerTickSize(-chartHeight)
        .outerTickSize(0)
        .tickPadding(10)
        .ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat))
        .tickFormat(d => moment(d).format(xAxisTickFormat));

      const yAxis = d3.svg.axis().scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      if (fieldFormat !== undefined) {
        yAxis.tickFormat(d => fieldFormat.convert(d, 'text'));
      }

      const axes = lineChartGroup.append('g');

      axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + chartHeight + ')')
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    }

    function drawLineChartHighlightedSpan() {
      // Draws a rectangle which highlights the time span that has been selected for view.
      // Note depending on the overall time range and the bucket span, the selected time
      // span may be longer than the range actually being plotted.
      const rectStart = Math.max(config.selectedEarliest, config.plotEarliest);
      const rectEnd = Math.min(config.selectedLatest, config.plotLatest);
      const rectWidth = lineChartXScale(rectEnd) - lineChartXScale(rectStart);

      lineChartGroup.append('rect')
        .attr('class', 'selected-interval')
        .attr('x', lineChartXScale(new Date(rectStart)))
        .attr('y', 1)
        .attr('width', rectWidth)
        .attr('height', chartHeight - 1);
    }

    function drawLineChartPaths(data) {
      lineChartGroup.append('path')
        .attr('class', 'values-line')
        .attr('d', lineChartValuesLine(data));
    }

    function drawLineChartMarkers(data) {
      // Render circle markers for the points.
      // These are used for displaying tooltips on mouseover.
      // Don't render dots where value=null (data gaps)
      const dots = lineChartGroup.append('g')
        .attr('class', 'chart-markers')
        .selectAll('.metric-value')
        .data(data.filter(d => d.value !== null));

      // Remove dots that are no longer needed i.e. if number of chart points has decreased.
      dots.exit().remove();
      // Create any new dots that are needed i.e. if number of chart points has increased.
      dots.enter().append('circle')
        .attr('r', LINE_CHART_ANOMALY_RADIUS)
        .on('mouseover', function (d) {
          showLineChartTooltip(d, this);
        })
        .on('mouseout', () => mlChartTooltipService.hide());

      // Update all dots to new positions.
      const threshold = mlSelectSeverityService.state.get('threshold');
      dots.attr('cx', function (d) { return lineChartXScale(d.date); })
        .attr('cy', function (d) { return lineChartYScale(d.value); })
        .attr('class', function (d) {
          let markerClass = 'metric-value';
          if (_.has(d, 'anomalyScore') && Number(d.anomalyScore) >= threshold.val) {
            markerClass += ' anomaly-marker ';
            markerClass += getSeverityWithLow(d.anomalyScore);
          }
          return markerClass;
        });

      // Add rectangular markers for any scheduled events.
      const scheduledEventMarkers = lineChartGroup.select('.chart-markers').selectAll('.scheduled-event-marker')
        .data(data.filter(d => d.scheduledEvents !== undefined));

      // Remove markers that are no longer needed i.e. if number of chart points has decreased.
      scheduledEventMarkers.exit().remove();
      // Create any new markers that are needed i.e. if number of chart points has increased.
      scheduledEventMarkers.enter().append('rect')
        .attr('width', LINE_CHART_ANOMALY_RADIUS * 2)
        .attr('height', SCHEDULED_EVENT_MARKER_HEIGHT)
        .attr('class', 'scheduled-event-marker')
        .attr('rx', 1)
        .attr('ry', 1);

      // Update all markers to new positions.
      scheduledEventMarkers.attr('x', (d) => lineChartXScale(d.date) - LINE_CHART_ANOMALY_RADIUS)
        .attr('y', (d) => lineChartYScale(d.value) - (SCHEDULED_EVENT_MARKER_HEIGHT / 2));

    }

    function showLineChartTooltip(marker, circle) {
      // Show the time and metric values in the tooltip.
      // Uses date, value, upper, lower and anomalyScore (optional) marker properties.
      const formattedDate = moment(marker.date).format('MMMM Do YYYY, HH:mm');
      let contents = formattedDate + '<br/><hr/>';

      if (_.has(marker, 'anomalyScore')) {
        const score = parseInt(marker.anomalyScore);
        const displayScore = (score > 0 ? score : '< 1');
        contents += ('anomaly score: ' + displayScore);
        if (_.has(marker, 'actual')) {
          // Display the record actual in preference to the chart value, which may be
          // different depending on the aggregation interval of the chart.
          contents += (`<br/>actual: ${formatValueFilter(marker.actual, config.functionDescription, fieldFormat)}`);
          contents += (`<br/>typical: ${formatValueFilter(marker.typical, config.functionDescription, fieldFormat)}`);
        } else {
          contents += (`<br/>value: ${formatValueFilter(marker.value, config.functionDescription, fieldFormat)}`);
          if (_.has(marker, 'byFieldName') && _.has(marker, 'numberOfCauses')) {
            const numberOfCauses = marker.numberOfCauses;
            const byFieldName = mlEscape(marker.byFieldName);
            if (numberOfCauses < 10) {
              // If numberOfCauses === 1, won't go into this block as actual/typical copied to top level fields.
              contents += `<br/> ${numberOfCauses} unusual ${byFieldName} values`;
            } else {
              // Maximum of 10 causes are stored in the record, so '10' may mean more than 10.
              contents += `<br/> ${numberOfCauses}+ unusual ${byFieldName} values`;
            }
          }
        }
      } else {
        contents += `value: ${formatValueFilter(marker.value, config.functionDescription, fieldFormat)}`;
      }

      if (_.has(marker, 'scheduledEvents')) {
        contents += `<br/><hr/>Scheduled events:<br/>${marker.scheduledEvents.map(mlEscape).join('<br/>')}`;
      }

      mlChartTooltipService.show(contents, circle, {
        x: LINE_CHART_ANOMALY_RADIUS * 2,
        y: 0
      });
    }
  }

  return {
    restrict: 'E',
    scope: {
      seriesConfig: '='
    },
    link: link,
    template: loadingIndicatorWrapperTemplate
  };
});
