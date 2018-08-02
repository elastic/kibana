/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { DetailStatus } from 'plugins/monitoring/components/apm/detail_status';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringApmSummary', () => {
  return {
    restrict: 'E',
    scope: {
      apm: '='
    },
    link(scope, $el) {
      scope.$watch('apm', apm => {
        render(<DetailStatus stats={apm} />, $el[0]);
      });
    }
  };
});
