/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

import 'ui/autoload/styles';
import './less/main.less';
import { Main } from './components/main';

const app = uiModules.get('apps/actions_service');

app.config($locationProvider => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});
app.config(stateManagementConfigProvider =>
  stateManagementConfigProvider.disable()
);

function RootController($scope, $element, $http, $injector) {
  const domNode = $element[0];

  // render react to DOM
  render(
    <I18nProvider>
      <Main title="secrets-tester" httpClient={$http} savedObjects={$injector.get('Private')(SavedObjectsClientProvider)} />
    </I18nProvider>,
    domNode
  );

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

chrome.setRootController('actions_service', RootController);
