/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { render } from 'react-dom';
import { find, get } from 'lodash';
import { uiRoutes } from '../../angular/helpers/routes';
import template from './index.html';
import { routeInitProvider } from '../../lib/route_init';
import { ajaxErrorHandlersProvider } from '../../lib/ajax_error_handler';
import { Legacy } from '../../legacy_shims';
import { Alerts } from '../../components/alerts';
import { MonitoringViewBaseEuiTableController } from '../base_eui_table_controller';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLink } from '@elastic/eui';
import { CODE_PATH_ALERTS, KIBANA_ALERTING_ENABLED } from '../../../common/constants';

function getPageData($injector) {
  const globalState = $injector.get('globalState');
  const $http = $injector.get('$http');
  const Private = $injector.get('Private');
  const url = KIBANA_ALERTING_ENABLED
    ? `../api/monitoring/v1/alert_status`
    : `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/legacy_alerts`;

  const timeBounds = Legacy.shims.timefilter.getBounds();
  const data = {
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString(),
    },
  };

  if (!KIBANA_ALERTING_ENABLED) {
    data.ccs = globalState.ccs;
  }

  return $http
    .post(url, data)
    .then((response) => {
      const result = get(response, 'data', []);
      if (KIBANA_ALERTING_ENABLED) {
        return result.alerts;
      }
      return result;
    })
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
      return routeInit({ codePaths: [CODE_PATH_ALERTS] });
    },
    alerts: getPageData,
  },
  controllerAs: 'alerts',
  controller: class AlertsView extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');

      // breadcrumbs + page title
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      super({
        title: i18n.translate('xpack.monitoring.alerts.clusterAlertsTitle', {
          defaultMessage: 'Cluster Alerts',
        }),
        getPageData,
        $scope,
        $injector,
        storageKey: 'alertsTable',
        reactNodeId: 'monitoringAlertsApp',
      });

      this.data = $route.current.locals.alerts;

      const renderReact = (data) => {
        const app = data.message ? (
          <p>{data.message}</p>
        ) : (
          <Alerts
            alerts={data}
            sorting={this.sorting}
            pagination={this.pagination}
            onTableChange={this.onTableChange}
          />
        );

        render(
          <EuiPage>
            <EuiPageBody>
              <EuiPageContent>
                {app}
                <EuiSpacer size="m" />
                <EuiLink href="#/overview">
                  <FormattedMessage
                    id="xpack.monitoring.alerts.clusterOverviewLinkLabel"
                    defaultMessage="« Cluster Overview"
                  />
                </EuiLink>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>,
          document.getElementById('monitoringAlertsApp')
        );
      };
      $scope.$watch(
        () => this.data,
        (data) => renderReact(data)
      );
    }
  },
});
