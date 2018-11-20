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
<<<<<<< HEAD
=======
import { I18nProvider } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

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
<<<<<<< HEAD
    constructor($injector, $scope, pageData) {
      super({
        title: 'Elasticsearch - Ccr - Shard',
=======
    constructor($injector, $scope, pageData, i18n) {
      super({
        title: i18n('xpack.monitoring.elasticsearch.ccr.shard.routeTitle', {
          defaultMessage: 'Elasticsearch - Ccr - Shard'
        }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        reactNodeId: 'elasticsearchCcrShardReact',
        getPageData,
        $scope,
        $injector
      });

<<<<<<< HEAD
      $scope.instance = `Index: ${get(pageData, 'stat.follower_index')} Shard: ${get(pageData, 'stat.shard_id')}`;
=======
      $scope.instance = i18n('xpack.monitoring.elasticsearch.ccr.shard.instanceTitle', {
        defaultMessage: 'Index: {followerIndex} Shard: {shardId}',
        values: {
          followerIndex: get(pageData, 'stat.follower_index'),
          shardId: get(pageData, 'stat.shard_id')
        }
      });
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });

      this.renderReact = (props) => {
        super.renderReact(
<<<<<<< HEAD
          <CcrShard {...props} />
=======
          <I18nProvider><CcrShard {...props} /> </I18nProvider>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        );
      };
    }
  }
});
