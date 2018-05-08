/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import angular from 'angular';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import { chartLimits } from 'plugins/ml/util/chart_utils.js';

/*
 * This demonstrates two different ways to set up the necessary boilerplate to
 * write unit tests for Angular Directives when you want to test the rendered
 * result.
 *
 * Note that the first two tests don't append the directive to the browser's
 * DOM. The boilerplate is simpler there because the tests don't rely on
 * checking DOM elements/attributes in their rendered state, the tests just
 * work if the correct rendered structure is present.
 *
 * The other two tests use a init(<data>, <tests>) helper function to append the
 * directive to the DOM and correctly initialize it. Otherwise the rendering of
 * the directive would fail because its link() function is dependent on certain
 * DOM attributes (e.g. the dynamic width and height of an element).
 * The init() function takes care of running the tests only after the initialize
 * $scope.$digest() is run.
 * Also note the use of done() with these tests, this is required if tests are
 * run in an asynchronous manner like using a callback in this case.
 */

describe('ML - <ml-explorer-chart>', () => {
  let $scope;
  let $compile;
  let $element;

  const seriesConfig = {
    jobId: 'population-03',
    detectorIndex: 0,
    metricFunction: 'sum',
    timeField: '@timestamp',
    interval: '1h',
    datafeedConfig: {
      datafeed_id: 'datafeed-population-03',
      job_id: 'population-03',
      query_delay: '60s',
      frequency: '600s',
      indices: ['filebeat-7.0.0*'],
      types: ['doc'],
      query: { match_all: { boost: 1 } },
      scroll_size: 1000,
      chunking_config: { mode: 'auto' },
      state: 'stopped'
    },
    metricFieldName: 'nginx.access.body_sent.bytes',
    functionDescription: 'sum',
    bucketSpanSeconds: 3600,
    detectorLabel: 'high_sum(nginx.access.body_sent.bytes) over nginx.access.remote_ip (population-03)',
    fieldName: 'nginx.access.body_sent.bytes',
    entityFields: [{
      fieldName: 'nginx.access.remote_ip',
      fieldValue: '72.57.0.53',
      $$hashKey: 'object:813'
    }],
    infoTooltip: `<div class=\"explorer-chart-info-tooltip\">job ID: population-03<br/>
      aggregation interval: 1h<br/>chart function: sum nginx.access.body_sent.bytes<br/>
      nginx.access.remote_ip: 72.57.0.53</div>`,
    loading: false,
    plotEarliest: 1487534400000,
    plotLatest: 1488168000000,
    selectedEarliest: 1487808000000,
    selectedLatest: 1487894399999
  };

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(function (_$compile_, $rootScope) {
      $compile = _$compile_;
      $scope = $rootScope.$new();
    });
  });

  afterEach(function () {
    $scope.$destroy();
  });

  it('Initialize', () => {
    $element = $compile('<ml-explorer-chart />')($scope);
    $scope.$digest();

    // without setting any attributes and corresponding data
    // the directive just ends up being empty.
    expect($element.find('.content-wrapper').html()).to.be('');
    expect($element.find('ml-loading-indicator .loading-indicator').length).to.be(0);
  });

  it('Loading status active, no chart', () => {
    $scope.seriesConfig = {
      loading: true
    };

    $element = $compile('<ml-explorer-chart series-config="seriesConfig" />')($scope);
    $scope.$digest();

    // test if the loading indicator is shown
    expect($element.find('ml-loading-indicator .loading-indicator').length).to.be(1);
  });

  describe('ML - <ml-explorer-chart> data rendering', () => {
    // For the following tests the directive needs to be rendered in the actual DOM,
    // because otherwise there wouldn't be a width available which would
    // trigger SVG errors. We use a fixed width to be able to test for
    // fine grained attributes of the chart.

    // basically a parameterized beforeEach
    function init(chartData, tests) {
      // First we create the element including a wrapper which sets the width:
      $element = angular.element('<div style="width: 500px"><ml-explorer-chart series-config="seriesConfig" /></div>');
      // Add the element to the body so it gets rendered
      $element.appendTo(document.body);

      $scope.seriesConfig = {
        ...seriesConfig,
        chartData,
        chartLimits: chartLimits(chartData)
      };

      // Compile the directive and run a $digest()
      $compile($element)($scope);
      $scope.$evalAsync(tests);
      $scope.$digest();
    }

    afterEach(function () {
      // remove the element from the DOM
      $element.remove();
    });

    it('Anomaly Explorer Chart with multiple data points', (done) => {
      // prepare data for the test case
      const chartData = [
        {
          date: new Date('2017-02-23T08:00:00.000Z'),
          value: 228243469, anomalyScore: 63.32916, numberOfCauses: 1,
          actual: [228243469], typical: [133107.7703441773]
        },
        { date: new Date('2017-02-23T09:00:00.000Z'), value: null },
        { date: new Date('2017-02-23T10:00:00.000Z'), value: null },
        { date: new Date('2017-02-23T11:00:00.000Z'), value: null },
        {
          date: new Date('2017-02-23T12:00:00.000Z'),
          value: 625736376, anomalyScore: 97.32085, numberOfCauses: 1,
          actual: [625736376], typical: [132830.424736973]
        },
        {
          date: new Date('2017-02-23T13:00:00.000Z'),
          value: 201039318, anomalyScore: 59.83488, numberOfCauses: 1,
          actual: [201039318], typical: [132739.5267403542]
        }
      ];

      init(chartData, () => {
        // the loading indicator should not be shown
        expect($element.find('ml-loading-indicator .loading-indicator').length).to.be(0);

        // test if all expected elements are present
        const svg = $element.find('svg');
        expect(svg.length).to.be(1);

        const lineChart = svg.find('g.line-chart');
        expect(lineChart.length).to.be(1);

        const rects = lineChart.find('rect');
        expect(rects.length).to.be(2);

        const chartBorder = angular.element(rects[0]);
        expect(+chartBorder.attr('x')).to.be(0);
        expect(+chartBorder.attr('y')).to.be(0);
        expect(+chartBorder.attr('height')).to.be(170);

        const selectedInterval = angular.element(rects[1]);
        expect(selectedInterval.attr('class')).to.be('selected-interval');
        expect(+selectedInterval.attr('y')).to.be(1);
        expect(+selectedInterval.attr('height')).to.be(169);

        // skip this test for now
        // TODO find out why this doesn't work in IE11
        // const xAxisTicks = lineChart.find('.x.axis .tick');
        // expect(xAxisTicks.length).to.be(4);
        const yAxisTicks = lineChart.find('.y.axis .tick');
        expect(yAxisTicks.length).to.be(10);

        const paths = lineChart.find('path');
        expect(angular.element(paths[0]).attr('class')).to.be('domain');
        expect(angular.element(paths[1]).attr('class')).to.be('domain');

        const line = angular.element(paths[2]);
        expect(line.attr('class')).to.be('values-line');
        // this is not feasable to test because of minimal differences
        // across various browsers
        // expect(line.attr('d'))
        //   .to.be('M205.56285511363637,152.3732523349513M215.3515625,7.72727272727272L217.79873934659093,162.27272727272728');
        expect(line.attr('d')).not.to.be(undefined);

        const dots = lineChart.find('g.values-dots circle');
        expect(dots.length).to.be(1);

        const dot = angular.element(dots[0]);
        expect(dot.attr('r')).to.be('1.5');

        const chartMarkers = lineChart.find('g.chart-markers circle');
        expect(chartMarkers.length).to.be(3);
        expect(chartMarkers.toArray().map(d => +angular.element(d).attr('r'))).to.eql([7, 7, 7]);

        done();
      });
    });

    it('Anomaly Explorer Chart with single data point', (done) => {
      const chartData = [
        {
          date: new Date('2017-02-23T08:00:00.000Z'),
          value: 228243469, anomalyScore: 63.32916, numberOfCauses: 1,
          actual: [228243469], typical: [228243469]
        }
      ];

      init(chartData, () => {
        const svg = $element.find('svg');
        const lineChart = svg.find('g.line-chart');
        const yAxisTicks = lineChart.find('.y.axis .tick');
        expect(yAxisTicks.length).to.be(13);
        done();
      });
    });
  });
});
