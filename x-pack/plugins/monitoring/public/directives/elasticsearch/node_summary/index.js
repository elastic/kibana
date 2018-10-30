/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { NodeDetailStatus } from 'plugins/monitoring/components/elasticsearch/node_detail_status';
import { I18nProvider } from '@kbn/i18n/react';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringNodeSummary', () => {
  return {
    restrict: 'E',
    scope: {
      node: '='
    },
    link(scope, $el) {
      scope.$watch('node', node => {
        render(<I18nProvider><NodeDetailStatus stats={node} /></I18nProvider>, $el[0]);
      });
    }
  };
});
