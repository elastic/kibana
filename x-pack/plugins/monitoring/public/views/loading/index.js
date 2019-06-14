/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { PageLoading } from 'plugins/monitoring/components';
import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import template from './index.html';
import { setAngularState, toggleSetupMode } from '../../lib/setup_mode';

const REACT_DOM_ID = 'monitoringLoadingReactApp';

uiRoutes
  .when('/loading', {
    template,
    controller: class {
      constructor($injector, $scope) {
        const monitoringClusters = $injector.get('monitoringClusters');
        const kbnUrl = $injector.get('kbnUrl');

        $scope.$on('$destroy', () => {
          unmountComponentAtNode(document.getElementById(REACT_DOM_ID));
        });

        $scope.$$postDigest(() => {
          this.renderReact();
        });

        monitoringClusters()
          .then(clusters => {
            if (clusters && clusters.length) {
              kbnUrl.changePath('/home');
              return Promise.reject();
            }
            setAngularState($scope, $injector);
            return toggleSetupMode(true)
              .then(() => {
                kbnUrl.changePath('/elasticsearch/nodes');
                $scope.$apply();
              });
          });
      }

      renderReact() {
        render(
          <I18nContext>
            <PageLoading />
          </I18nContext>,
          document.getElementById(REACT_DOM_ID)
        );
      }
    },
  });
