/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './messagebar.html';

import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .controller('MlMessageBarController', function ($scope) {
    $scope.messages = mlMessageBarService.getMessages();
    $scope.removeMessage = mlMessageBarService.removeMessage;
  })
  .directive('mlMessageBar', function () {
    return {
      restrict: 'AE',
      template
    };
  });
