/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';
import { Main } from './frame/main';

// TODO: Convert this to the "new platform" way of doing UI
function App($scope: any, $element: Element[]) {
  const el = $element[0];

  $scope.$on('$destroy', () => unmountComponentAtNode(el));

  return render(
    <I18nProvider>
      <Main />
    </I18nProvider>,
    el
  );
}

chrome.setRootController('vizEditor', App);
