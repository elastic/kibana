/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Chart showing event rate data, plus a progress bar indicating the progress of
 * the creation of a job.
 */

import $ from 'jquery';
import d3 from 'd3';
import angular from 'angular';
import moment from 'moment';
import 'ui/timefilter';

import { TimeBucketsProvider } from 'ui/time_buckets';
import { numTicksForDateFormat } from 'plugins/ml/util/chart_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlEventRateChart', function (Private) {

  function link(scope, element) {

    let svgWidth = 0;
    const barChartHeight = scope.eventRateChartHeight;
    const margin = { top: 0, right: 0, bottom: 20, left: scope.chartTicksMargin.width };
    const svgHeight = barChartHeight + margin.top + margin.bottom;
    let vizWidth  = svgWidth  - margin.left - margin.right;
    const chartLimits = { max: 0, min: 0 };
    const TimeBuckets = Private(TimeBucketsProvider);

    let barChartXScale = null;
    let swimlaneXScale = null;
    let barChartYScale = null;

    let barChartGroup;
    let swimlaneGroup;

    let $progressBar;

    scope.$on('render', () => {
      init();
      createSVGGroups();
      drawBarChart();
    });

    scope.$on('render-results', () => {
      drawResults();
    });

    element.on('$destroy', () => {
      scope.$destroy();
    });

    function init() {
      const $el = angular.element('.event-rate-container');

      margin.left = scope.chartTicksMargin.width;

      svgWidth = $el.width();
      vizWidth = svgWidth  - margin.left - margin.right;

      barChartXScale = d3.scale.linear().rangeRound([0, vizWidth], .05);
      swimlaneXScale = d3.time.scale().range([0, vizWidth]);
      barChartYScale = d3.scale.linear().range([barChartHeight, 0]);
    }


    function createSVGGroups() {
      if (scope.chartData.bars === undefined) {
        return;
      }

      // Clear any existing elements from the visualization,
      // then build the svg elements for the bubble chart.
      const chartElement = d3.select(element.get(0));
      chartElement.select('svg').remove();
      chartElement.select('.progress').remove();

      if (chartElement.select('.progress-bar')[0][0] === null) {
        const style = `width: ${(+vizWidth + 2)}px;
          margin-bottom: -${(+barChartHeight - 15)}px;
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

      barChartGroup = svg.append('g')
        .attr('class', 'bar-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      swimlaneGroup = svg.append('g')
        .attr('class', 'swimlane')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    function drawBarChart() {
      const data = scope.chartData.bars;

      // The swimlane and x-axis labels should be aligned with the other line charts
      // however, when this chart is first drawn, this data is not available.
      // on first display use the bar data for the scale
      let finerData = scope.chartData.bars;
      if (scope.chartData.line.length > 0) {
        finerData = scope.chartData.line;
      }
      swimlaneXScale.domain(d3.extent(finerData, d => d.date));

      barChartXScale = d3.time.scale()
        .range([0, vizWidth])
        .domain(d3.extent(data, d => d.date));

      chartLimits.max = d3.max(data, (d) => d.value);
      chartLimits.min = 0;

      // add padding of 10% of the difference between max and min
      // to the upper and lower ends of the y-axis
      const padding = (chartLimits.max - chartLimits.min) * 0.05;
      chartLimits.max += padding;

      barChartYScale = barChartYScale.domain([
        chartLimits.min,
        chartLimits.max
      ]);

      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new TimeBuckets();
      timeBuckets.setInterval('auto');
      if (data.length > 0) {
        const xDomain = barChartXScale.domain();
        const bounds = { min: moment(xDomain[0]), max: moment(xDomain[1]) };
        timeBuckets.setBounds(bounds);
      }

      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      const xAxis = d3.svg.axis().scale(swimlaneXScale).orient('bottom')
        .innerTickSize(-barChartHeight).outerTickSize(0).tickPadding(10)
        .ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat))
        .tickFormat((d) => {
          return moment(d).format(xAxisTickFormat);
        });
      const yAxis = d3.svg.axis().scale(barChartYScale).orient('left')
        .innerTickSize(-vizWidth).outerTickSize(0).tickPadding(10);

      // add a white background to the chart
      barChartGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', barChartHeight)
        .attr('width', vizWidth)
        .style('fill', '#FFFFFF');

      // Add border round plot area.
      barChartGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', barChartHeight)
        .attr('width', vizWidth)
        .style('stroke', '#cccccc')
        .style('fill', 'none')
        .style('stroke-width', 1);

      drawBarChartAxes(xAxis, yAxis);
      drawBarChartPaths(data);
    }

    function drawBarChartAxes(xAxis, yAxis) {

      const axes = barChartGroup.append('g');

      axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + barChartHeight + ')')
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    }

    function drawBarChartPaths(data) {
      const earliestTime = scope.chartData.earliestTime;
      let cellWidth = 0;
      if (data.length > 0) {
        cellWidth = barChartXScale(earliestTime + scope.chartData.barsInterval) - barChartXScale(earliestTime);
      }

      barChartGroup.selectAll('bar')
        .data(data)
        .enter().append('rect')
        .style('fill', '#32a7c2')
        .attr('class', 'bar')
        .attr('x', (d) => { return barChartXScale(d.time); })
        .attr('width', cellWidth)
        .attr('y', (d) => { return barChartYScale(d.value); })
        .attr('height', (d) => { return barChartHeight - barChartYScale(d.value); });
    }

    function drawResults() {
      updateProgressBar();
      drawSwimlane(vizWidth, barChartHeight);
    }

    function drawSwimlane(swlWidth, swlHeight) {
      const lineData = scope.chartData.line;
      const data = scope.chartData.swimlane;
      const earliestTime = scope.chartData.earliestTime;

      let cellWidth = 0;
      if (data.length > 0) {
        cellWidth = barChartXScale(earliestTime + scope.chartData.swimlaneInterval) - barChartXScale(earliestTime);
      }

      d3.time.scale().range([0, swlWidth])
        .domain(d3.extent(lineData, (d) => d.date));

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
        .attr('x', (d) => swimlaneXScale(d.date))
        .attr('y', 0)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('class', (d) => d.value > 0 ? 'swimlane-cell' : 'swimlane-cell-hidden')
        .attr('width', cellWidth - 0)
        .attr('height', swlHeight - 0)
        .style('fill', (d) => color(d.value));

    }

    function updateProgressBar() {
      const pcnt = scope.chartData.percentComplete;
      $progressBar.css('width', pcnt + '%');
    }
  }

  return {
    scope: {
      chartData: '=',
      eventRateChartHeight: '=',
      chartTicksMargin: '='
    },
    link: link
  };
});
