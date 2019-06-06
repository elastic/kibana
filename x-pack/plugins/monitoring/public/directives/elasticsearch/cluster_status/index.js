/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import { ClusterStatus } from 'plugins/monitoring/components/elasticsearch/cluster_status';
import { I18nContext } from 'ui/i18n';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterStatusElasticsearch', () => {
  return {
    restrict: 'E',
    scope: {
      status: '='
    },
    link(scope, $el) {
      scope.$on('$destroy', () => $el && $el[0] && unmountComponentAtNode($el[0]));
      scope.$watch('status', status => {
        render(<I18nContext><ClusterStatus stats={status} /></I18nContext>, $el[0]);
      });
    }
  };
});
