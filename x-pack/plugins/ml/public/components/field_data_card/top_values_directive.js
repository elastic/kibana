/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './top_values.html';
import { mlEscape } from 'plugins/ml/util/string_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlTopValues', function () {
  return {
    restrict: 'E',
    template,
    link(scope) {
      scope.mlEscape = mlEscape;
    }
  };
});
