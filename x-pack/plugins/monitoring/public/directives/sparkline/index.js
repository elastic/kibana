/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { uiModules } from 'ui/modules';
import { Sparkline } from 'plugins/monitoring/components/sparkline';
import moment from 'moment';
import { formatMetric } from '../../lib/format_number';

const uiModule = uiModules.get('plugins/monitoring/directives', []);
uiModule.directive('sparkline', ($injector) => {
  const timefilter = $injector.get('timefilter');
  const config = $injector.get('config');

  const dateFormat = config.get('dateFormat');

  return {
    restrict: 'E',
    scope: {
      // Monitoring series object (containing data, metric, and timeRange properties)
      series: '='
    },
    link(scope, $elem) {

      function onBrush(xaxis) {
        scope.$evalAsync(() => {
          timefilter.time.from = moment(xaxis.from);
          timefilter.time.to = moment(xaxis.to);
          timefilter.time.mode = 'absolute';
        });
      }

      function tooltipXValueFormatter(xValue) {
        return moment(xValue).format(dateFormat);
      }

      function tooltipYValueFormatter(yValue) {
        return formatMetric(yValue, scope.series.metric.format, scope.series.metric.units);
      }

      scope.$watch('series', series => {
        const options = {
          xaxis: series.timeRange
        };

        ReactDOM.render(
          <Sparkline
            series={series.data}
            onBrush={onBrush}
            options={options}
            tooltip={{
              xValueFormatter: tooltipXValueFormatter,
              yValueFormatter: tooltipYValueFormatter
            }}
          />,
          $elem[0]
        );
      }, true);

      scope.$on('$destroy', () => ReactDOM.unmountComponentAtNode($elem[0]));
    }
  };
});
