/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

// directive for creating a form label including a hoverable icon
// to provide additional information in a tooltip. label and tooltip
// text elements get unique ids based on label-id so they can be
// referenced by attributes, for example:
//
// <ml-form-label label-id="uid">Label Text</ml-form-lable>
// <input
//   type="text"
//   aria-labelledby="ml_aria_label_uid"
//   aria-describedby="ml_aria_description_uid"
// />
module.directive('mlFormLabel', function () {
  return {
    scope: {
      labelId: '@',
      tooltipAppendToBody: '@',
      tooltipPlacement: '@'
    },
    restrict: 'E',
    replace: false,
    transclude: true,
    template: `
      <label class="kuiFormLabel" id="ml_aria_label_{{labelId}}" ng-transclude></label>
      <i
        ml-info-icon="{{labelId}}"
        tooltip-append-to-body="{{tooltipAppendToBody || false}}"
        tooltip-placement="{{tooltipPlacement || 'bottom'}}"
      />
    `
  };
});
