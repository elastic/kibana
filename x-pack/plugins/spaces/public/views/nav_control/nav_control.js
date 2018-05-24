/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constant } from 'lodash';
import { chromeNavControlsRegistry } from 'ui/registry/chrome_nav_controls';
import { uiModules } from 'ui/modules';
import { SpacesManager } from 'plugins/spaces/lib/spaces_manager';
import template from 'plugins/spaces/views/nav_control/nav_control.html';
import 'plugins/spaces/views/nav_control/nav_control.less';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { NavControlPopover } from 'plugins/spaces/views/nav_control/nav_control_popover';

chromeNavControlsRegistry.register(constant({
  name: 'spaces',
  order: 90,
  template
}));

const module = uiModules.get('spaces', ['kibana']);

module.controller('spacesNavController', ($scope, $http, chrome, globalNavState, activeSpace) => {
  const domNode = document.getElementById(`spacesNavReactRoot`);

  const spacesManager = new SpacesManager($http, chrome);

  render(<NavControlPopover spacesManager={spacesManager} activeSpace={activeSpace} globalNavState={globalNavState} />, domNode);

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });

});
