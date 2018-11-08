/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { App } from '../../components/app';
import { factories } from 'ui/embeddable/embeddable_factories_registry';

export function CanvasRootController(canvasStore, $scope, $element, Private) {
  const domNode = $element[0];

  factories.initialize(Private);
  render(
    <Provider store={canvasStore}>
      <App />
    </Provider>,
    domNode
  );

  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}
