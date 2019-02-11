/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import 'ui/autoload/styles';
import { SIEMRuleForm } from './components';

export function SIEMRulesController($scope: ng.IScope, $element: ng.IAugmentedJQuery) {
  const domNode = $element[0];

  render(<SIEMRuleForm />, domNode);

  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}
