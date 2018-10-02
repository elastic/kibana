/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constant } from 'lodash';
import { SpacesManager } from 'plugins/spaces/lib/spaces_manager';
// @ts-ignore
import template from 'plugins/spaces/views/nav_control/nav_control.html';
import 'plugins/spaces/views/nav_control/nav_control.less';
import { UserProfileProvider } from 'plugins/xpack_main/services/user_profile';
// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import { chromeNavControlsRegistry } from 'ui/registry/chrome_nav_controls';

import { NavControlPopover } from 'plugins/spaces/views/nav_control/nav_control_popover';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Space } from '../../../common/model/space';

chromeNavControlsRegistry.register(
  constant({
    name: 'spaces',
    order: 90,
    template,
  })
);

const module = uiModules.get('spaces_nav', ['kibana']);

export interface SpacesNavState {
  getActiveSpace: () => Space;
  refreshSpacesList: () => void;
}

let spacesManager: SpacesManager;

module.controller(
  'spacesNavController',
  ($scope: any, $http: any, chrome: any, Private: any, activeSpace: any) => {
    const userProfile = Private(UserProfileProvider);

    const domNode = document.getElementById(`spacesNavReactRoot`);
    const spaceSelectorURL = chrome.getInjected('spaceSelectorURL');

    spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

    let mounted = false;

    $scope.$parent.$watch('isVisible', function isVisibleWatcher(isVisible: boolean) {
      if (isVisible && !mounted) {
        render(
          <NavControlPopover
            spacesManager={spacesManager}
            activeSpace={activeSpace}
            userProfile={userProfile}
          />,
          domNode
        );
        mounted = true;
      }
    });

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      if (domNode) {
        unmountComponentAtNode(domNode);
      }
      mounted = false;
    });
  }
);

module.service('spacesNavState', (activeSpace: any) => {
  return {
    getActiveSpace: () => {
      return activeSpace.space;
    },
    refreshSpacesList: () => {
      if (spacesManager) {
        spacesManager.requestRefresh();
      }
    },
  } as SpacesNavState;
});
