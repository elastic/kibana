/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { ClusterStatus } from 'plugins/monitoring/components/logstash/cluster_status';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterStatusLogstash', () => {
  return {
    restrict: 'E',
    scope: {
      status: '='
    },
    link(scope, $el) {
      scope.$watch('status', status => {
        render(<ClusterStatus stats={status} />, $el[0]);
      });
    }
  };
});
