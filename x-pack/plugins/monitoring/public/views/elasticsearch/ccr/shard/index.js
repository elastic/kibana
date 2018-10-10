/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import uiRoutes from 'ui/routes';
import { getPageData } from './get_page_data';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../../base_controller';
import { CcrShard } from '../../../../components/elasticsearch/ccr_shard';

uiRoutes.when('/elasticsearch/ccr/:index/shard/:shardId', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData,
  },
  controllerAs: 'elasticsearchCcr',
  controller: class ElasticsearchCcrController extends MonitoringViewBaseController {
    constructor($injector, $scope, pageData) {
      super({
        title: 'Elasticsearch - Ccr - Shard',
        reactNodeId: 'elasticsearchCcrShardReact',
        getPageData,
        $scope,
        $injector
      });

      $scope.instance = `Index: ${get(pageData, 'stat.follower_index')} Shard: ${get(pageData, 'stat.shard_id')}`;

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });

      this.renderReact = (props) => {
        super.renderReact(
          <CcrShard {...props} />
        );
      };
    }
  }
});
