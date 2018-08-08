/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { IndexDetailStatus } from 'plugins/monitoring/components/elasticsearch/index_detail_status';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringIndexSummary', () => {
  return {
    restrict: 'E',
    scope: { summary: '=' },
    link(scope, $el) {
      scope.$watch('summary', summary => {
        render(<IndexDetailStatus stats={summary} />, $el[0]);
      });
    }
  };
});

