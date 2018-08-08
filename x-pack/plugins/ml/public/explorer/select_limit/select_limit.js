/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
* AngularJS directive for rendering a select element with limit levels.
*/

import _ from 'lodash';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import template from './select_limit.html';
import 'plugins/ml/components/controls/controls_select';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .service('mlSelectLimitService', function (Private) {
    const stateFactory = Private(stateFactoryProvider);
    this.state = stateFactory('mlSelectLimit', {
      limit: { display: '10', val: 10 }
    });
  })
  .directive('mlSelectLimit', function (mlSelectLimitService) {
    return {
      restrict: 'E',
      template,
      link: function (scope, element) {
        scope.limitOptions = [
          { display: '5', val: 5 },
          { display: '10', val: 10 },
          { display: '25', val: 25 },
          { display: '50', val: 50 }
        ];

        const limitState = mlSelectLimitService.state.get('limit');
        const limitValue = _.get(limitState, 'val', 0);
        let limitOption = scope.limitOptions.find(d => d.val === limitValue);
        if (limitOption === undefined) {
          // Attempt to set value in URL which doesn't map to one of the options.
          limitOption = scope.limitOptions.find(d => d.val === 10);
        }
        scope.limit = limitOption;
        mlSelectLimitService.state.set('limit', scope.limit);

        scope.setLimit = function (limit) {
          if (!_.isEqual(scope.limit, limit)) {
            scope.limit = limit;
            mlSelectLimitService.state.set('limit', scope.limit).changed();
          }
        };

        function setLimit() {
          scope.setLimit(mlSelectLimitService.state.get('limit'));
        }

        mlSelectLimitService.state.watch(setLimit);

        element.on('$destroy', () => {
          mlSelectLimitService.state.unwatch(setLimit);
          scope.$destroy();
        });
      }
    };
  });
