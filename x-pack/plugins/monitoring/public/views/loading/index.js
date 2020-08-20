/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for single index detail
 */
import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../angular/helpers/routes';
import { routeInitProvider } from '../../lib/route_init';
import template from './index.html';
import { Legacy } from '../../legacy_shims';
import { CODE_PATH_ELASTICSEARCH } from '../../../common/constants';
import { PageLoading } from '../../components';

const CODE_PATHS = [CODE_PATH_ELASTICSEARCH];
uiRoutes.when('/loading', {
  template,
  controllerAs: 'monitoringLoading',
  controller: class {
    constructor($injector, $scope) {
      const Private = $injector.get('Private');
      const titleService = $injector.get('title');
      titleService(
        $scope.cluster,
        i18n.translate('xpack.monitoring.loading.pageTitle', {
          defaultMessage: 'Loading',
        })
      );

      this.init = () => {
        const reactNodeId = 'monitoringLoadingReact';
        const renderElement = document.getElementById(reactNodeId);
        if (!renderElement) {
          console.warn(`"#${reactNodeId}" element has not been added to the DOM yet`);
          return;
        }
        const I18nContext = Legacy.shims.I18nContext;
        render(
          <I18nContext>
            <PageLoading />
          </I18nContext>,
          renderElement
        );
      };

      const routeInit = Private(routeInitProvider);
      routeInit({ codePaths: CODE_PATHS, fetchAllClusters: true }).then((clusters) => {
        if (!clusters || !clusters.length) {
          window.location.hash = '#/no-data';
          return;
        }
        if (clusters.length === 1) {
          // Bypass the cluster listing if there is just 1 cluster
          window.history.replaceState(null, null, '#/overview');
          return;
        }

        window.history.replaceState(null, null, '#/home');
      });
    }
  },
});
