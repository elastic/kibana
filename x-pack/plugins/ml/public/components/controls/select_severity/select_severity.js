/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
* AngularJS directive for rendering a select element with threshold levels.
*/

import _ from 'lodash';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import template from './select_severity.html';
import 'plugins/ml/components/controls/controls_select';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .service('mlSelectSeverityService', function (Private) {
    const stateFactory = Private(stateFactoryProvider);
    this.state = stateFactory('mlSelectSeverity', {
      threshold: { display: 'warning', val: 0 }
    });
  })
  .directive('mlSelectSeverity', function (mlSelectSeverityService) {
    return {
      restrict: 'E',
      template,
      link: function (scope, element) {
        scope.thresholdOptions = [
          { display: 'critical', val: 75 },
          { display: 'major', val: 50 },
          { display: 'minor', val: 25 },
          { display: 'warning', val: 0 }
        ];

        const thresholdState = mlSelectSeverityService.state.get('threshold');
        const thresholdValue = _.get(thresholdState, 'val', 0);
        let thresholdOption = scope.thresholdOptions.find(d => d.val === thresholdValue);
        if (thresholdOption === undefined) {
          // Attempt to set value in URL which doesn't map to one of the options.
          thresholdOption = scope.thresholdOptions.find(d => d.val === 0);
        }
        scope.threshold = thresholdOption;
        mlSelectSeverityService.state.set('threshold', scope.threshold);

        scope.setThreshold = function (threshold) {
          if(!_.isEqual(scope.threshold, threshold)) {
            scope.threshold = threshold;
            mlSelectSeverityService.state.set('threshold', scope.threshold).changed();
          }
        };

        function setThreshold() {
          scope.setThreshold(mlSelectSeverityService.state.get('threshold'));
        }

        mlSelectSeverityService.state.watch(setThreshold);

        element.on('$destroy', () => {
          mlSelectSeverityService.state.unwatch(setThreshold);
          scope.$destroy();
        });
      }
    };
  });
