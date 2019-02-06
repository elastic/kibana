/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Logstash Node Pipelines Listing
 */

import React from 'react';
import uiRoutes from 'ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import {
  isPipelineMonitoringSupportedInVersion
} from 'plugins/monitoring/lib/logstash/pipelines';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { MonitoringViewBaseEuiTableController } from '../../../';
import { I18nContext } from 'ui/i18n';
import { PipelineListing } from '../../../../components/logstash/pipeline_listing/pipeline_listing';

const getPageData = ($injector) => {
  const $route = $injector.get('$route');
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const Private = $injector.get('Private');

  const logstashUuid = $route.current.params.uuid;
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash/node/${logstashUuid}/pipelines`;
  const timeBounds = timefilter.getBounds();

  return $http.post(url, {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    }
  })
    .then(response => response.data)
    .catch((err) => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
};

function makeUpgradeMessage(logstashVersion, i18n) {
  if (isPipelineMonitoringSupportedInVersion(logstashVersion)) {
    return null;
  }

  return i18n('xpack.monitoring.logstash.node.pipelines.notAvailableDescription', {
    defaultMessage:
    'Pipeline monitoring is only available in Logstash version 6.0.0 or higher. This node is running version {logstashVersion}.',
    values: {
      logstashVersion
    }
  });
}

uiRoutes
  .when('/logstash/node/:uuid/pipelines', {
    template,
    resolve: {
      clusters(Private) {
        const routeInit = Private(routeInitProvider);
        return routeInit();
      },
      pageData: getPageData
    },
    controller: class extends MonitoringViewBaseEuiTableController {
      constructor($injector, $scope, i18n) {
        const kbnUrl = $injector.get('kbnUrl');
        const config = $injector.get('config');

        super({
          defaultData: {},
          getPageData,
          reactNodeId: 'monitoringLogstashNodePipelinesApp',
          $scope,
          $injector
        });

        $scope.$watch(() => this.data, data => {
          if (!data || !data.nodeSummary) {
            return;
          }

          this.setTitle(i18n('xpack.monitoring.logstash.node.pipelines.routeTitle', {
            defaultMessage: 'Logstash - {nodeName} - Pipelines',
            values: {
              nodeName: data.nodeSummary.name
            }
          }));

          this.renderReact(
            <I18nContext>
              <PipelineListing
                className="monitoringLogstashPipelinesTable"
                onBrush={this.onBrush}
                stats={data.nodeSummary}
                data={data.pipelines}
                sorting={this.sorting}
                pagination={this.pagination}
                onTableChange={this.onTableChange}
                dateFormat={config.get('dateFormat')}
                upgradeMessage={makeUpgradeMessage(data.nodeSummary.version, i18n)}
                angular={{
                  kbnUrl,
                  scope: $scope,
                }}
              />
            </I18nContext>
          );
        });
      }
    }
  });
