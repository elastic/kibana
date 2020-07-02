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
import { partial } from 'lodash';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { getPageData } from './get_page_data';
import template from './index.html';
import { Node } from '../../../components/elasticsearch/node/node';
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { nodesByIndices } from '../../../components/elasticsearch/shard_allocation/transformers/nodes_by_indices';
import { MonitoringViewBaseController } from '../../base_controller';
import { CODE_PATH_ELASTICSEARCH } from '../../../../common/constants';

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
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchNodeApp',
        $scope,
        $injector,
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

          const shards = data.shards;
          $scope.totalCount = shards.length;
          $scope.showing = transformer(shards, data.nodes);
          $scope.labels = labels.node;

          this.renderReact(
            <Node
              scope={$scope}
              nodeId={this.nodeName}
              clusterUuid={$scope.cluster.cluster_uuid}
              onBrush={this.onBrush}
              zoomInfo={this.zoomInfo}
              {...data}
            />
          );
        }
      );
    }
  },
});
