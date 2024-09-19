/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unmountComponentAtNode } from 'react-dom';

export const manageAngularLifecycle = ($scope: any, $route: any, elem: HTMLElement | null) => {
  const lastRoute = $route.current;

  const deregister = $scope.$on('$locationChangeSuccess', () => {
    const currentRoute = $route.current;
    if (lastRoute.$$route.template === currentRoute.$$route.template) {
      $route.current = lastRoute;
    }
  });

  $scope.$on('$destroy', () => {
    if (deregister) {
      deregister();
    }

    if (elem) {
      unmountComponentAtNode(elem);
    }
  });
};
