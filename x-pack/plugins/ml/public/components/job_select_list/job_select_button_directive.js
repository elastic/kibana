/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * ml-job-select-list directive for rendering a multi-select control for selecting
 * one or more jobs from the list of configured jobs.
 */

import template from './job_select_button.html';

import 'ui/accessibility/kbn_accessible_click';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('jobSelectButton', function (mlJobSelectService) {

  function link(scope) {
    scope.selectJobBtnJobIdLabel = '';
    scope.unsafeHtml = '';
    scope.description = scope.singleSelection ? mlJobSelectService.singleJobDescription : mlJobSelectService.description;

    scope.createMenu = function () {
      let txt = '<ml-job-select-list ';
      if (scope.timeseriesonly) {
        txt += 'timeseriesonly="true" ';
      }
      if (scope.singleSelection) {
        txt += 'single-selection="true" ';
      }
      txt += '></ml-job-select-list>';
      scope.unsafeHtml = txt;
    };
  }

  return {
    scope: {
      timeseriesonly: '=',
      singleSelection: '='
    },
    link,
    replace: true,
    template
  };
});
