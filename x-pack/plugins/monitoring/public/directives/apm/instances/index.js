/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { ApmServerInstances } from '../../../components/apm/instances';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringApmInstances', kbnUrl => {
  return {
    restrict: 'E',
    scope: {
      apms: '=',
    },
    link(scope, $el) {
      const goToInstance = uuid => {
        scope.$evalAsync(() => {
          kbnUrl.changePath(`/apm/instances/${uuid}`);
        });
      };

      scope.$watch('apms.data.apms', () => {
        const apmsTable = (
          <ApmServerInstances
            apms={scope.apms}
            goToInstance={goToInstance}
          />
        );
        render(apmsTable, $el[0]);
      });

    }
  };
});
