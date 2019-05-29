/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/fancy_forms';
import { uiModules } from 'ui/modules';
import template from './watch_action.html';
import angular from 'angular';
import '../watch_email_action';
import '../watch_logging_action';
import '../watch_slack_action';

const app = uiModules.get('xpack/watcher');

app.directive('watchAction', function ($injector) {
  const $compile = $injector.get('$compile');

  return {
    restrict: 'E',
    template: template,
    replace: true,
    scope: {
      action: '=',
      isCollapsed: '=',
      isValid: '=',
      onChange: '=',
      onToggle: '=',
      onSimulate: '=',
      onDelete: '=',
      onValid: '=',
      onInvalid: '='
    },
    bindToController: true,
    controllerAs: 'watchAction',
    link: function ($scope, $el) {
      const $container = $el.find('.watchActionDetailsContent');
      $container.empty();

      const newScope = $scope.$new();
      newScope.action = $scope.watchAction.action;
      newScope.form = $scope.watchAction.form;
      newScope.onChange = $scope.watchAction.onChange;

      const $innerEl = angular.element(newScope.action.constructor.template);
      const postLink = $compile($innerEl);
      $container.append($innerEl);
      postLink(newScope);
    },
    controller: class WatchActionController {
      constructor($scope) {
        $scope.$watch('watchAction.isCollapsed', (isCollapsed) => {
          if (isCollapsed) {
            this.form.$setTouched(true);
          }
        });

        $scope.$watch('watchAction.form.$valid', () => {
          this.checkValidity();
        });
      }

      checkValidity = () => {
        const isValid = !(this.form.$invalid);

        if (isValid) {
          this.onValid(this.action);
        } else {
          this.onInvalid(this.action);
        }
      }

    }
  };
});
