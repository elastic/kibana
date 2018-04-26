/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import 'plugins/spaces/views/space_selector/space_selector.less';
import template from 'plugins/spaces/views/space_selector/space_selector.html';
import { uiModules } from 'ui/modules';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SpaceSelector } from './space_selector';

const module = uiModules.get('spaces_selector', []);
module.controller('spacesSelectorController', ($scope, $http) => {
  const domNode = document.getElementById('spaceSelectorRoot');
  render(<SpaceSelector httpAgent={$http} chrome={chrome} />, domNode);

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
});

chrome
  .setVisible(false)
  .setRootTemplate(template);
