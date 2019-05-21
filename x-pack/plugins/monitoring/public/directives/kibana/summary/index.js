/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import { DetailStatus } from 'plugins/monitoring/components/kibana/detail_status';
import { I18nContext } from 'ui/i18n';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringKibanaSummary', () => {
  return {
    restrict: 'E',
    scope: {
      kibana: '='
    },
    link(scope, $el) {
      scope.$on('$destroy', () => $el && $el[0] && unmountComponentAtNode($el[0]));
      scope.$watch('kibana', kibana => {
        render(<I18nContext><DetailStatus stats={kibana} /></I18nContext>, $el[0]);
      });
    }
  };
});
