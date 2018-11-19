/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { DetailStatus } from 'plugins/monitoring/components/logstash/detail_status';
import { I18nProvider } from '@kbn/i18n/react';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringLogstashNodeSummary', () => {
  return {
    restrict: 'E',
    scope: {
      logstash: '='
    },
    link(scope, $el) {
      scope.$watch('logstash', logstash => {
        render(<I18nProvider><DetailStatus stats={logstash} /></I18nProvider>, $el[0]);
      });
    }
  };
});
