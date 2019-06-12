/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constant } from 'lodash';
import { SpacesManager } from 'plugins/spaces/lib/spaces_manager';
// @ts-ignore
import template from 'plugins/spaces/views/nav_control/nav_control.html';
import { NavControlPopover } from 'plugins/spaces/views/nav_control/nav_control_popover';
// @ts-ignore
import { Path } from 'plugins/xpack_main/services/path';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import ReactDOM from 'react-dom';
import { NavControlSide } from 'ui/chrome/directives/header_global_nav';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { chromeHeaderNavControlsRegistry } from 'ui/registry/chrome_header_nav_controls';
// @ts-ignore
import { chromeNavControlsRegistry } from 'ui/registry/chrome_nav_controls';
import { Space } from '../../../common/model/space';
import { SpacesGlobalNavButton } from './components/spaces_global_nav_button';
import { SpacesHeaderNavButton } from './components/spaces_header_nav_button';

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
  ($scope: any, $http: any, chrome: any, activeSpace: any) => {
    const domNode = document.getElementById(`spacesNavReactRoot`);
    const spaceSelectorURL = chrome.getInjected('spaceSelectorURL');

    spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

    let mounted = false;

    $scope.$parent.$watch('isVisible', function isVisibleWatcher(isVisible: boolean) {
      if (isVisible && !mounted && !Path.isUnauthenticated()) {
        render(
          <I18nContext>
            <NavControlPopover
              spacesManager={spacesManager}
              activeSpace={activeSpace}
              anchorPosition={'rightCenter'}
              buttonClass={SpacesGlobalNavButton}
            />
          </I18nContext>,
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

chromeHeaderNavControlsRegistry.register(($http: any, chrome: any, activeSpace: any) => ({
  name: 'spaces',
  order: 1000,
  side: NavControlSide.Left,
  render(el: HTMLElement) {
    if (Path.isUnauthenticated()) {
      return;
    }

    const spaceSelectorURL = chrome.getInjected('spaceSelectorURL');

    spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

    ReactDOM.render(
      <I18nContext>
        <NavControlPopover
          spacesManager={spacesManager}
          activeSpace={activeSpace}
          anchorPosition="downLeft"
          buttonClass={SpacesHeaderNavButton}
        />
      </I18nContext>,
      el
    );
  },
}));
