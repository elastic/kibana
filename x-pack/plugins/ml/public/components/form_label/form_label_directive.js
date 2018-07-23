/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import angular from 'angular';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { FormLabel } from './form_label';

// directive for creating a form label including a hoverable icon
// to provide additional information in a tooltip. label and tooltip
// text elements get unique ids based on label-id so they can be
// referenced by attributes, for example:
//
// <ml-form-label label-id="uid">Label Text</ml-form-label>
// <input
//   type="text"
//   aria-labelledby="ml_aria_label_uid"
//   aria-describedby="ml_aria_description_uid"
// />
module.directive('mlFormLabel', function () {
  return {
    scope: {
      labelId: '@'
    },
    restrict: 'E',
    replace: false,
    transclude: true,
    link: (scope, element, attrs, ctrl, transclude) => {
      const props = {
        labelId: scope.labelId,
        labelClassName: 'kuiFormLabel',
        // transclude the label text/elements from the angular template
        // to the labelRef from the react component.
        ref: c => angular.element(c.labelRef.current).append(transclude())
      };

      ReactDOM.render(
        React.createElement(FormLabel, props),
        element[0]
      );
    }
  };
});
