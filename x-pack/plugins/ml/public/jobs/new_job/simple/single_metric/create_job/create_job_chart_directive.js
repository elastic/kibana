/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Chart showing metric, annotated with anomalies.
 */

import $ from 'jquery';
import d3 from 'd3';
import angular from 'angular';
import moment from 'moment';
import 'ui/timefilter';

import { TimeBucketsProvider } from 'ui/time_buckets';
import { drawLineChartDots, numTicksForDateFormat } from 'plugins/ml/util/chart_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlSingleMetricJobChart', function (Private) {

  function link(scope, element) {

    const svgWidth  = angular.element('.single-metric-job-container').width();
    const lineChartHeight = scope.chartHeight;
    const swimlaneHeight = 30;
    const margin = { top: 0, right: 0, bottom: 0, left: scope.chartTicksMargin.width };
    const svgHeight = lineChartHeight + swimlaneHeight + margin.top + margin.bottom;
    let vizWidth  = svgWidth  - margin.left - margin.right;
    const chartLimits = { max: 0, min: 0 };
    const TimeBuckets = Private(TimeBucketsProvider);

    let lineChartXScale = null;
    let lineChartYScale = null;


    // TODO - do we want to use interpolate('basis') to smooth the connecting lines?
    let lineChartValuesLine = null;
    let lineChartBoundedArea = null;

    let lineChartGroup;
    let modelChartGroup;
    let swimlaneGroup;
    // let dotChartGroup;

    let $progressBar;

    scope.$on('render', () => {
      init();
      createSVGGroups();
      drawLineChart();
    });

    scope.$on('render-results', () => {
      drawResults();
    });

    element.on('$destroy', () => {
      scope.$destroy();
    });

    function init() {
      margin.left = scope.chartTicksMargin.width;
      vizWidth = svgWidth  - margin.left - margin.right;

      lineChartXScale = d3.time.scale().range([0, vizWidth]);
      lineChartYScale = d3.scale.linear().range([lineChartHeight, 0]);

      // TODO - do we want to use interpolate('basis') to smooth the connecting lines?
      lineChartValuesLine = d3.svg.line()
        .x(d => lineChartXScale(d.date))
        .y(d => lineChartYScale(d.value))
        .defined(d => d.value !== null);
      lineChartBoundedArea = d3.svg.area()
        .x (d => lineChartXScale(d.date) || 0)
        .y0(d => lineChartYScale(Math.max(chartLimits.min, Math.min(chartLimits.max, d.upper))))
        .y1(d => lineChartYScale(Math.min(chartLimits.max, Math.max(chartLimits.min, d.lower))));
    }


    function createSVGGroups() {
      if (scope.chartData.line === undefined) {
        return;
      }

      // Clear any existing elements from the visualization,
      // then build the svg elements for the bubble chart.
      const chartElement = d3.select(element.get(0));
      chartElement.select('svg').remove();
      chartElement.select('.progress').remove();

      if (chartElement.select('.progress-bar')[0][0] === null) {
        const style = `width: ${(+vizWidth + 2)}px;
          margin-bottom: -${(+lineChartHeight + 5)}px;
          margin-left: ${(+margin.left - 1)}px;'`;

        chartElement.append('div')
          .attr('class', 'progress')
          .attr('style', style)
          .append('div')
          .attr('class', 'progress-bar');
      }

      $progressBar = $('.progress-bar');

      const svg = chartElement.append('svg')
        .attr('width',  svgWidth)
        .attr('height', svgHeight);

      swimlaneGroup = svg.append('g')
        .attr('class', 'swimlane')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      modelChartGroup = svg.append('g')
        .attr('class', 'model-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      lineChartGroup = svg.append('g')
        .attr('class', 'line-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    function drawLineChart() {
      const data = scope.chartData.line;

      lineChartXScale = lineChartXScale.domain(d3.extent(data, d => d.date));

      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new TimeBuckets();
      timeBuckets.setInterval('auto');
      if (data.length > 0) {
        const xDomain = lineChartXScale.domain();
        const bounds = { min: moment(xDomain[0]), max: moment(xDomain[1]) };
        timeBuckets.setBounds(bounds);
      }
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      chartLimits.max = d3.max(data, (d) => d.value);
      chartLimits.min = d3.min(data, (d) => d.value);

      // add padding of 10% of the difference between max and min
      // to the upper and lower ends of the y-axis
      const padding = (chartLimits.max - chartLimits.min) * 0.1;
      chartLimits.max += padding;
      chartLimits.min -= padding;

      lineChartYScale = lineChartYScale.domain([
        chartLimits.min,
        chartLimits.max
      ]);

      const xAxis = d3.svg.axis().scale(lineChartXScale).orient('bottom')
        .innerTickSize(-lineChartHeight).outerTickSize(0).tickPadding(10)
        .ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat))
        .tickFormat((d) => {
          return moment(d).format(xAxisTickFormat);
        });
      const yAxis = d3.svg.axis().scale(lineChartYScale).orient('left')
        .innerTickSize(-vizWidth).outerTickSize(0).tickPadding(10);

      if (scope.chartData.fieldFormat !== undefined) {
        yAxis.tickFormat(d => scope.chartData.fieldFormat.convert(d, 'text'));
      }

      // Add border round plot area.
      lineChartGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', lineChartHeight)
        .attr('width', vizWidth)
        .style('stroke', '#cccccc')
        .style('fill', 'none')
        .style('stroke-width', 1);


      drawLineChartAxes(xAxis, yAxis);
      drawLineChartPaths(data);
      drawLineChartDots(data, lineChartGroup, lineChartValuesLine);
    }

    function drawLineChartAxes(xAxis, yAxis) {

      const axes = lineChartGroup.append('g');

      axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + lineChartHeight + ')')
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    }

    function drawLineChartPaths(data) {
      lineChartGroup.append('path')
        .attr('class', 'values-line')
        .attr('d', lineChartValuesLine(data));
    }

    function drawResults() {
      const model = scope.chartData.model;


      drawModelPaths(model);
      drawSwimlane(vizWidth, lineChartHeight);
      updateProgressBar();
    }

    function drawModelPaths(model) {
      modelChartGroup.selectAll('*').remove();
      modelChartGroup.append('path')
        .attr('class', 'area bounds')
        .attr('d', lineChartBoundedArea(model));
    }

    function drawSwimlane(swlWidth, swlHeight) {
      const data = scope.chartData.swimlane;

      let cellWidth = 0;
      if (data.length > 0) {
        cellWidth = lineChartXScale(data[0].time + scope.chartData.swimlaneInterval) - lineChartXScale(data[0].time);
      }

      d3.time.scale().range([0, swlWidth])
        .domain(d3.extent(data, (d) => d.date));

      d3.scale.linear().range([swlHeight, 0])
        .domain([0, swlHeight]);

      // Set up the color scale to use for indicating score.
      const color = d3.scale.threshold()
        .domain([3, 25, 50, 75, 100])
        .range(['#d2e9f7', '#8bc8fb', '#ffdd00', '#ff7e00', '#fe5050']);

      swimlaneGroup.select('.swimlane-cells').remove();

      const cells = swimlaneGroup.append('g')
        .attr('class', 'swimlane-cells')
        .selectAll('cells')
        .data(data);

      cells.enter().append('rect')
        .attr('x', (d) => lineChartXScale(d.date))
        .attr('y', 0)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('class', (d) => d.value > 0 ? 'swimlane-cell' : 'swimlane-cell-hidden')
        .attr('width', cellWidth)
        .attr('height', swlHeight)
        .style('fill', (d) => color(d.value));

    }

    function updateProgressBar() {
      const pcnt = (scope.chartData.percentComplete < 100) ? scope.chartData.percentComplete : 0;
      $progressBar.css('width', pcnt + '%');
    }
  }

  return {
    scope: {
      chartData: '=',
      chartHeight: '=',
      chartTicksMargin: '='
    },
    link: link
  };
});
