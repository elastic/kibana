/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import React from 'react';
import { I18nContext } from 'ui/i18n';
import { Listing } from '../../../components/beats/listing/listing';

uiRoutes.when('/beats/beats', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData,
  },
  controllerAs: 'beats',
  controller: class BeatsListing extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      // breadcrumbs + page title
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });

      super({
        title: i18n.translate('xpack.monitoring.beats.routeTitle', { defaultMessage: 'Beats' }),
        storageKey: 'beats.beats',
        getPageData,
        reactNodeId: 'monitoringBeatsInstancesApp',
        $scope,
        $injector
      });

      this.data = $route.current.locals.pageData;
      this.scope = $scope;
      this.kbnUrl = $injector.get('kbnUrl');

      //Bypassing super.updateData, since this controller loads its own data
      this._isDataInitialized = true;

      $scope.$watch(() => this.data, () => this.renderComponent());
    }

    renderComponent() {
      const { sorting, pagination, onTableChange } = this.scope.beats;
      this.renderReact(
        <I18nContext>
          <Listing
            stats={this.data.stats}
            data={this.data.listing}
            sorting={this.sorting || sorting}
            pagination={this.pagination || pagination}
            onTableChange={this.onTableChange || onTableChange}
            angular={{
              kbnUrl: this.kbnUrl,
              scope: this.scope,
            }}
          />
        </I18nContext>
      );
    }
  }
});
