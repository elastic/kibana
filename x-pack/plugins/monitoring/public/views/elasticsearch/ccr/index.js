/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uiRoutes from 'ui/routes';
import { getPageData } from './get_page_data';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { Ccr } from '../../../components/elasticsearch/ccr';
import { MonitoringViewBaseController } from '../../base_controller';
<<<<<<< HEAD
=======
import { I18nProvider } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

uiRoutes.when('/elasticsearch/ccr', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData,
  },
  controllerAs: 'elasticsearchCcr',
  controller: class ElasticsearchCcrController extends MonitoringViewBaseController {
<<<<<<< HEAD
    constructor($injector, $scope) {
      super({
        title: 'Elasticsearch - Ccr',
=======
    constructor($injector, $scope, i18n) {
      super({
        title: i18n('xpack.monitoring.elasticsearch.ccr.routeTitle', {
          defaultMessage: 'Elasticsearch - Ccr'
        }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        reactNodeId: 'elasticsearchCcrReact',
        getPageData,
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });

      this.renderReact = ({ data }) => {
        super.renderReact(
<<<<<<< HEAD
          <Ccr data={data} />
=======
          <I18nProvider>
            <Ccr data={data} />
          </I18nProvider>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        );
      };
    }
  }
});
