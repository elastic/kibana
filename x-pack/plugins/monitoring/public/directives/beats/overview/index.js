/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { BeatsOverview } from '../../../components/beats/overview';

export function monitoringBeatsOverviewProvider() {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      onBrush: '<',
      zoomInfo: '<',
    },
    link(scope, $el) {
      scope.$on('$destroy', () => $el && $el[0] && unmountComponentAtNode($el[0]));

      scope.$watch('data', (data = {}) => {
        render(
          <BeatsOverview {...data} onBrush={scope.onBrush} zoomInfo={scope.zoomInfo} />,
          $el[0]
        );
      });
    },
  };
}
