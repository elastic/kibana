/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { find, get } from 'lodash';
import uiRoutes from 'ui/routes';
import template from './index.html';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { I18nContext } from 'ui/i18n';
import { timefilter } from 'ui/timefilter';
import { Alerts } from '../../components/alerts';
import { MonitoringViewBaseEuiTableController } from '../base_eui_table_controller';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLink } from '@elastic/eui';

function getPageData($injector) {
  const globalState = $injector.get('globalState');
  const $http = $injector.get('$http');
  const Private = $injector.get('Private');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/alerts`;

  const timeBounds = timefilter.getBounds();

  return $http.post(url, {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    }
  })
    .then(response => get(response, 'data', []))
    .catch((err) => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/alerts', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    alerts: getPageData
  },
  controllerAs: 'alerts',
  controller: class AlertsView extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope, i18n) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      const kbnUrl = $injector.get('kbnUrl');

      // breadcrumbs + page title
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });

      super({
        title: i18n('xpack.monitoring.alerts.clusterAlertsTitle', { defaultMessage: 'Cluster Alerts' }),
        getPageData,
        $scope,
        $injector,
        reactNodeId: 'monitoringAlertsApp'
      });

      this.data = $route.current.locals.alerts;

      const renderReact = data => {
        const app = data.message
          ? (<p>{data.message}</p>)
          : (<Alerts
            alerts={data}
            angular={{ kbnUrl, scope: $scope }}
            sorting={this.sorting}
            pagination={this.pagination}
            onTableChange={this.onTableChange}
          />);

        render(
          <I18nContext>
            <EuiPage>
              <EuiPageBody>
                <EuiPageContent>
                  {app}
                  <EuiSpacer size="m"/>
                  <EuiLink
                    href="#/overview"
                  >
                    <FormattedMessage
                      id="xpack.monitoring.alerts.clusterOverviewLinkLabel"
                      defaultMessage="« Cluster Overview"
                    />
                  </EuiLink>
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </I18nContext>,
          document.getElementById('monitoringAlertsApp')
        );
      };
      $scope.$watch(() => this.data, data => renderReact(data));
    }
  }
});
