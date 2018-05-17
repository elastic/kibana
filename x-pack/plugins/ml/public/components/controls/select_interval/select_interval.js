/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering a select element with various interval levels.
 */

import _ from 'lodash';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import template from './select_interval.html';
import 'plugins/ml/components/controls/controls_select';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .service('mlSelectIntervalService', function (Private) {
    const stateFactory = Private(stateFactoryProvider);
    this.state = stateFactory('mlSelectInterval', {
      interval: { display: 'Auto', val: 'auto' }
    });
  })
  .directive('mlSelectInterval', function (mlSelectIntervalService) {
    return {
      restrict: 'E',
      template,
      link: function (scope, element) {
        scope.intervalOptions = [
          { display: 'Auto', val: 'auto' },
          { display: '1 hour', val: 'hour' },
          { display: '1 day', val: 'day' },
          { display: 'Show all', val: 'second' }
        ];

        const intervalState = mlSelectIntervalService.state.get('interval');
        const intervalValue = _.get(intervalState, 'val', 'auto');
        let intervalOption = scope.intervalOptions.find(d => d.val === intervalValue);
        if (intervalOption === undefined) {
          // Attempt to set value in URL which doesn't map to one of the options.
          intervalOption = scope.intervalOptions.find(d => d.val === 'auto');
        }
        scope.interval = intervalOption;
        mlSelectIntervalService.state.set('interval', scope.interval);

        scope.setInterval = function (interval) {
          if (!_.isEqual(scope.interval, interval)) {
            scope.interval = interval;
            mlSelectIntervalService.state.set('interval', scope.interval).changed();
          }
        };

        function setScopeInterval() {
          scope.setInterval(mlSelectIntervalService.state.get('interval'));
        }

        mlSelectIntervalService.state.watch(setScopeInterval);

        element.on('$destroy', () => {
          mlSelectIntervalService.state.unwatch(setScopeInterval);
          scope.$destroy();
        });
      }
    };
  });
