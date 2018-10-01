/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesManager } from 'plugins/spaces/lib/spaces_manager';
// @ts-ignore
import template from 'plugins/spaces/views/space_selector/space_selector.html';
import 'plugins/spaces/views/space_selector/space_selector.less';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
// @ts-ignore
import { uiModules } from 'ui/modules';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Space } from '../../../common/model/space';
import { SpaceSelector } from './space_selector';

const module = uiModules.get('spaces_selector', []);
module.controller(
  'spacesSelectorController',
  ($scope: any, $http: any, spaces: Space[], spaceSelectorURL: string) => {
    const domNode = document.getElementById('spaceSelectorRoot');

    const spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

    render(<SpaceSelector spaces={spaces} spacesManager={spacesManager} />, domNode);

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      if (domNode) {
        unmountComponentAtNode(domNode);
      }
    });
  }
);

chrome.setVisible(false).setRootTemplate(template);
