/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Kibana Instance
 */
import React from 'react';
import { get } from 'lodash';
import { uiRoutes } from '../../../angular/helpers/routes';
import { ajaxErrorHandlersProvider } from '../../../lib/ajax_error_handler';
import { routeInitProvider } from '../../../lib/route_init';
import template from './index.html';
import { Legacy } from '../../../legacy_shims';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../../components/chart';
import { DetailStatus } from '../../../components/kibana/detail_status';
import { MonitoringViewBaseController } from '../../base_controller';
import { CODE_PATH_KIBANA, ALERT_KIBANA_VERSION_MISMATCH } from '../../../../common/constants';
import { AlertsCallout } from '../../../alerts/callout';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const $route = $injector.get('$route');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/kibana/${$route.current.params.uuid}`;
  const timeBounds = Legacy.shims.timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
    })
    .then((response) => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/kibana/instances/:uuid', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_KIBANA] });
    },
    pageData: getPageData,
  },
  controllerAs: 'monitoringKibanaInstanceApp',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        title: `Kibana - ${get($scope.pageData, 'kibanaSummary.name')}`,
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringKibanaInstanceApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [ALERT_KIBANA_VERSION_MISMATCH],
          },
        },
      });

      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data || !data.metrics) {
            return;
          }

          this.setTitle(`Kibana - ${get(data, 'kibanaSummary.name')}`);

          this.renderReact(
            <EuiPage>
              <EuiPageBody>
                <EuiPanel>
                  <DetailStatus stats={data.kibanaSummary} />
                </EuiPanel>
                <EuiSpacer size="m" />
                <AlertsCallout alerts={this.alerts} />
                <EuiPageContent>
                  <EuiFlexGrid columns={2} gutterSize="s">
                    <EuiFlexItem grow={true}>
                      <MonitoringTimeseriesContainer
                        series={data.metrics.kibana_requests}
                        onBrush={this.onBrush}
                        zoomInfo={this.zoomInfo}
                      />
                      <EuiSpacer />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <MonitoringTimeseriesContainer
                        series={data.metrics.kibana_response_times}
                        onBrush={this.onBrush}
                        zoomInfo={this.zoomInfo}
                      />
                      <EuiSpacer />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <MonitoringTimeseriesContainer
                        series={data.metrics.kibana_memory}
                        onBrush={this.onBrush}
                        zoomInfo={this.zoomInfo}
                      />
                      <EuiSpacer />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <MonitoringTimeseriesContainer
                        series={data.metrics.kibana_average_concurrent_connections}
                        onBrush={this.onBrush}
                        zoomInfo={this.zoomInfo}
                      />
                      <EuiSpacer />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <MonitoringTimeseriesContainer
                        series={data.metrics.kibana_os_load}
                        onBrush={this.onBrush}
                        zoomInfo={this.zoomInfo}
                      />
                      <EuiSpacer />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <MonitoringTimeseriesContainer
                        series={data.metrics.kibana_process_delay}
                        onBrush={this.onBrush}
                        zoomInfo={this.zoomInfo}
                      />
                      <EuiSpacer />
                    </EuiFlexItem>
                  </EuiFlexGrid>
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          );
        }
      );
    }
  },
});
