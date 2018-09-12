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
import { UserProfileProvider } from 'plugins/xpack_main/services/user_profile';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { NavControlPopover } from 'plugins/spaces/views/nav_control/nav_control_popover';

chromeNavControlsRegistry.register(constant({
  name: 'spaces',
  order: 90,
  template
}));

const module = uiModules.get('spaces_nav', ['kibana']);

let spacesManager;

module.controller('spacesNavController', ($scope, $http, chrome, Private, activeSpace, spaceSelectorURL) => {
  const userProfile = Private(UserProfileProvider);

  const domNode = document.getElementById(`spacesNavReactRoot`);

  spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

  let mounted = false;

  $scope.$parent.$watch('isVisible', function (isVisible) {
    if (isVisible && !mounted) {
      render(<NavControlPopover spacesManager={spacesManager} activeSpace={activeSpace} userProfile={userProfile} />, domNode);
      mounted = true;
    }
  });

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
    mounted = false;
  });

});

module.service('spacesNavState', (activeSpace) => {
  return {
    getActiveSpace: () => {
      return activeSpace.space;
    },
    refreshSpacesList: () => {
      if (spacesManager) {
        spacesManager.requestRefresh();
      }
    }
  };
});
