/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Logstash Node Advanced View
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../../angular/helpers/routes';
import { ajaxErrorHandlersProvider } from '../../../../lib/ajax_error_handler';
import { routeInitProvider } from '../../../../lib/route_init';
import template from './index.html';
import { Legacy } from '../../../../legacy_shims';
import { MonitoringViewBaseController } from '../../../base_controller';
import { DetailStatus } from '../../../../components/logstash/detail_status';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../../../components/chart';
import {
  CODE_PATH_LOGSTASH,
  ALERT_LOGSTASH_VERSION_MISMATCH,
} from '../../../../../common/constants';
import { AlertsCallout } from '../../../../alerts/callout';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const $route = $injector.get('$route');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash/node/${$route.current.params.uuid}`;
  const timeBounds = Legacy.shims.timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      is_advanced: true,
    })
    .then((response) => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/logstash/node/:uuid/advanced', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
    pageData: getPageData,
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringLogstashNodeAdvancedApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [ALERT_LOGSTASH_VERSION_MISMATCH],
          },
        },
        telemetryPageViewTitle: 'logstash_node_advanced',
      });

      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data || !data.nodeSummary) {
            return;
          }

          this.setTitle(
            i18n.translate('xpack.monitoring.logstash.node.advanced.routeTitle', {
              defaultMessage: 'Logstash - {nodeName} - Advanced',
              values: {
                nodeName: data.nodeSummary.name,
              },
            })
          );

          this.setPageTitle(
            i18n.translate('xpack.monitoring.logstash.node.advanced.pageTitle', {
              defaultMessage: 'Logstash node: {nodeName}',
              values: {
                nodeName: data.nodeSummary.name,
              },
            })
          );

          const metricsToShow = [
            data.metrics.logstash_node_cpu_utilization,
            data.metrics.logstash_queue_events_count,
            data.metrics.logstash_node_cgroup_cpu,
            data.metrics.logstash_pipeline_queue_size,
            data.metrics.logstash_node_cgroup_stats,
          ];

          this.renderReact(
            <EuiPage>
              <EuiPageBody>
                <EuiPanel>
                  <DetailStatus stats={data.nodeSummary} />
                </EuiPanel>
                <EuiSpacer size="m" />
                <AlertsCallout alerts={this.alerts} />
                <EuiPageContent>
                  <EuiFlexGrid columns={2} gutterSize="s">
                    {metricsToShow.map((metric, index) => (
                      <EuiFlexItem key={index}>
                        <MonitoringTimeseriesContainer
                          series={metric}
                          onBrush={this.onBrush}
                          zoomInfo={this.zoomInfo}
                          {...data}
                        />
                        <EuiSpacer />
                      </EuiFlexItem>
                    ))}
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
