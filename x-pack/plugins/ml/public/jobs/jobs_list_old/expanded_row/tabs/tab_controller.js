/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('TabController', function ($scope) {
  // space and tab characters don't display nicely in html
  // so show the words 'space' and 'tab' instead
  $scope.formatDelimiter = function (del) {
    let txt = del;
    switch (del) {
      case ' ':
        txt = 'space';
        break;
      case '\t':
        txt = 'tab';
        break;
      default:
        txt = del;
        break;
    }
    return txt;
  };
});

