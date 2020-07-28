/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import React, { Fragment } from 'react';
import { Listing } from '../../../components/beats/listing/listing';
import { SetupModeRenderer } from '../../../components/renderers';
import { CODE_PATH_BEATS, BEATS_SYSTEM_ID } from '../../../../common/constants';

uiRoutes.when('/beats/beats', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_BEATS] });
    },
    pageData: getPageData,
  },
  controllerAs: 'beats',
  controller: class BeatsListing extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      // breadcrumbs + page title
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      super({
        title: i18n.translate('xpack.monitoring.beats.routeTitle', { defaultMessage: 'Beats' }),
        storageKey: 'beats.beats',
        getPageData,
        reactNodeId: 'monitoringBeatsInstancesApp',
        $scope,
        $injector,
      });

      this.data = $route.current.locals.pageData;
      this.scope = $scope;
      this.injector = $injector;

      //Bypassing super.updateData, since this controller loads its own data
      this._isDataInitialized = true;

      $scope.$watch(
        () => this.data,
        () => this.renderComponent()
      );
    }

    renderComponent() {
      const { sorting, pagination, onTableChange } = this.scope.beats;
      this.renderReact(
        <SetupModeRenderer
          scope={this.scope}
          injector={this.injector}
          productName={BEATS_SYSTEM_ID}
          render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
            <Fragment>
              {flyoutComponent}
              <Listing
                stats={this.data.stats}
                data={this.data.listing}
                setupMode={setupMode}
                sorting={this.sorting || sorting}
                pagination={this.pagination || pagination}
                onTableChange={this.onTableChange || onTableChange}
              />
              {bottomBarComponent}
            </Fragment>
          )}
        />
      );
    }
  },
});
