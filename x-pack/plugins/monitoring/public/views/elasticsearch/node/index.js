/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for Node Detail
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { get, partial } from 'lodash';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { getPageData } from './get_page_data';
import template from './index.html';
import { SetupModeRenderer } from '../../../components/renderers';
import { Node } from '../../../components/elasticsearch/node/node';
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { nodesByIndices } from '../../../components/elasticsearch/shard_allocation/transformers/nodes_by_indices';
import { MonitoringViewBaseController } from '../../base_controller';
import {
  CODE_PATH_ELASTICSEARCH,
  ALERT_CPU_USAGE,
  ALERT_THREAD_POOL_SEARCH_REJECTIONS,
  ALERT_THREAD_POOL_WRITE_REJECTIONS,
  ALERT_MISSING_MONITORING_DATA,
  ALERT_DISK_USAGE,
  ALERT_MEMORY_USAGE,
  ELASTICSEARCH_SYSTEM_ID,
} from '../../../../common/constants';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';

uiRoutes.when('/elasticsearch/nodes/:node', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controllerAs: 'monitoringElasticsearchNodeApp',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const nodeName = $route.current.params.node;

      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.node.overview.routeTitle', {
          defaultMessage: 'Elasticsearch - Nodes - {nodeName} - Overview',
          values: {
            nodeName,
          },
        }),
        telemetryPageViewTitle: 'elasticsearch_node',
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchNodeApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [
              ALERT_CPU_USAGE,
              ALERT_DISK_USAGE,
              ALERT_THREAD_POOL_SEARCH_REJECTIONS,
              ALERT_THREAD_POOL_WRITE_REJECTIONS,
              ALERT_MEMORY_USAGE,
              ALERT_MISSING_MONITORING_DATA,
            ],
            filters: [
              {
                nodeUuid: nodeName,
              },
            ],
          },
        },
      });

      this.nodeName = nodeName;

      const features = $injector.get('features');
      const callPageData = partial(getPageData, $injector);
      // show/hide system indices in shard allocation view
      $scope.showSystemIndices = features.isEnabled('showSystemIndices', false);
      $scope.toggleShowSystemIndices = (isChecked) => {
        $scope.showSystemIndices = isChecked;
        // preserve setting in localStorage
        features.update('showSystemIndices', isChecked);
        // update the page
        callPageData().then((data) => (this.data = data));
      };

      const transformer = nodesByIndices();
      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data || !data.shards) {
            return;
          }

          this.setTitle(
            i18n.translate('xpack.monitoring.elasticsearch.node.overview.routeTitle', {
              defaultMessage: 'Elasticsearch - Nodes - {nodeName} - Overview',
              values: {
                nodeName: get(data, 'nodeSummary.name'),
              },
            })
          );

          this.setPageTitle(
            i18n.translate('xpack.monitoring.elasticsearch.node.overview.pageTitle', {
              defaultMessage: 'Elasticsearch node: {node}',
              values: {
                node: get(data, 'nodeSummary.name'),
              },
            })
          );

          const shards = data.shards;
          $scope.totalCount = shards.length;
          $scope.showing = transformer(shards, data.nodes);
          $scope.labels = labels.node;

          this.renderReact(
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName={ELASTICSEARCH_SYSTEM_ID}
              render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
                <SetupModeContext.Provider value={{ setupModeSupported: true }}>
                  {flyoutComponent}
                  <Node
                    scope={$scope}
                    setupMode={setupMode}
                    alerts={this.alerts}
                    nodeId={this.nodeName}
                    clusterUuid={$scope.cluster.cluster_uuid}
                    onBrush={this.onBrush}
                    zoomInfo={this.zoomInfo}
                    {...data}
                  />
                  {bottomBarComponent}
                </SetupModeContext.Provider>
              )}
            />
          );
        }
      );
    }
  },
});
