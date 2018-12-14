/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from 'react-dom';
import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { I18nProvider } from '@kbn/i18n/react';
import { Listing } from '../../../components/logstash/listing';

uiRoutes.when('/logstash/nodes', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData
  },
  controllerAs: 'lsNodes',
  controller: class LsNodesList extends MonitoringViewBaseEuiTableController {

    constructor($injector, $scope) {
      super({
        title: 'Logstash - Nodes',
        storageKey: 'logstash.nodes',
        getPageData,
        $scope,
        $injector
      });

      const $route = $injector.get('$route');
      const kbnUrl = $injector.get('kbnUrl');
      this.data = $route.current.locals.pageData;
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });

      const renderReact = (data) => {
        if (!data) {
          return;
        }

        render(
          <I18nProvider>
            <Listing
              data={data.nodes}
              stats={data.clusterStatus}
              sorting={this.sorting}
              pagination={this.pagination}
              onTableChange={this.onTableChange}
              angular={{ kbnUrl, scope: $scope }}
            />
          </I18nProvider>,
          document.getElementById('monitoringLogstashNodesApp')
        );
      };

      $scope.$watch(() => this.data, data => {
        renderReact(data);
      });
    }
  }
});
