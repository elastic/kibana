/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { uiRoutes } from '../../../../angular/helpers/routes';
import { getPageData } from './get_page_data';
import { routeInitProvider } from '../../../../lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../../base_controller';
import { CcrShard } from '../../../../components/elasticsearch/ccr_shard';
import {
  CODE_PATH_ELASTICSEARCH,
  RULE_CCR_READ_EXCEPTIONS,
  ELASTICSEARCH_SYSTEM_ID,
} from '../../../../../common/constants';
import { SetupModeRenderer } from '../../../../components/renderers';
import { SetupModeContext } from '../../../../components/setup_mode/setup_mode_context';

uiRoutes.when('/elasticsearch/ccr/:index/shard/:shardId', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controllerAs: 'elasticsearchCcr',
  controller: class ElasticsearchCcrController extends MonitoringViewBaseController {
    constructor($injector, $scope, pageData) {
      const $route = $injector.get('$route');
      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.routeTitle', {
          defaultMessage: 'Elasticsearch - Ccr - Shard',
        }),
        reactNodeId: 'elasticsearchCcrShardReact',
        getPageData,
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [RULE_CCR_READ_EXCEPTIONS],
            filters: [
              {
                shardId: $route.current.pathParams.shardId,
              },
            ],
          },
        },
      });

      $scope.instance = i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.instanceTitle', {
        defaultMessage: 'Index: {followerIndex} Shard: {shardId}',
        values: {
          followerIndex: get(pageData, 'stat.follower_index'),
          shardId: get(pageData, 'stat.shard_id'),
        },
      });

      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data) {
            return;
          }

          this.setPageTitle(
            i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.pageTitle', {
              defaultMessage: 'Elasticsearch Ccr Shard - Index: {followerIndex} Shard: {shardId}',
              values: {
                followerIndex: get(
                  pageData,
                  'stat.follower.index',
                  get(pageData, 'stat.follower_index')
                ),
                shardId: get(
                  pageData,
                  'stat.follower.shard.number',
                  get(pageData, 'stat.shard_id')
                ),
              },
            })
          );

          this.renderReact(
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName={ELASTICSEARCH_SYSTEM_ID}
              render={({ flyoutComponent, bottomBarComponent }) => (
                <SetupModeContext.Provider value={{ setupModeSupported: true }}>
                  {flyoutComponent}
                  <CcrShard {...data} alerts={this.alerts} />
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
