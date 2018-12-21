/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { ClusterStatus } from 'plugins/monitoring/components/kibana/cluster_status';
import { I18nProvider } from '@kbn/i18n/react';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterStatusKibana', () => {
  return {
    restrict: 'E',
    scope: {
      status: '=',
    },
    link(scope, $el) {
      scope.$watch('status', status => {
        render(<I18nProvider><ClusterStatus stats={status} /></I18nProvider>, $el[0]);
      });
    },
  };
});
