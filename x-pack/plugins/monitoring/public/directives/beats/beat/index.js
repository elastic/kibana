/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Beat } from '../../../components/beats/beat';

//monitoringBeatsBeat
export function monitoringBeatsBeatProvider() {
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
          <Beat
            summary={data.summary}
            metrics={data.metrics}
            onBrush={scope.onBrush}
            zoomInfo={scope.zoomInfo}
          />,
          $el[0]
        );
      });
    },
  };
}
