/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Overview } from 'plugins/monitoring/components/cluster/overview';
import { uiModules } from 'ui/modules';
import { I18nProvider } from '@kbn/i18n/react';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterOverview', (kbnUrl, showLicenseExpiration) => {
  return {
    restrict: 'E',
    scope: { cluster: '=' },
    link(scope, $el) {

      const changeUrl = target => {
        scope.$evalAsync(() => {
          kbnUrl.changePath(target);
        });
      };

      scope.$watch('cluster', cluster => {
        ReactDOM.render((
          <I18nProvider>
            <Overview
              cluster={cluster}
              changeUrl={changeUrl}
              showLicenseExpiration={showLicenseExpiration}
            />
          </I18nProvider>
        ), $el[0]);
      });

    }
  };
});
