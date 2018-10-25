/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { App } from '../../components/app';

export function CanvasRootController(canvasStore, $scope, $element) {
  const domNode = $element[0];

  const CanvasProvider = props => (
    <I18nProvider>
      <Provider store={props.store}>{props.children}</Provider>
    </I18nProvider>
  );

  render(
    <CanvasProvider store={canvasStore}>
      <App />
    </CanvasProvider>,
    domNode
  );

  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}
