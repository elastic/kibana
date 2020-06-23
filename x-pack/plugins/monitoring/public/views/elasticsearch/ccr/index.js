/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { getPageData } from './get_page_data';
import { routeInitProvider } from '../../../lib/route_init';
import template from './index.html';
import { Ccr } from '../../../components/elasticsearch/ccr';
import { MonitoringViewBaseController } from '../../base_controller';
import { CODE_PATH_ELASTICSEARCH } from '../../../../common/constants';

uiRoutes.when('/elasticsearch/ccr', {
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
    constructor($injector, $scope) {
      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.ccr.routeTitle', {
          defaultMessage: 'Elasticsearch - Ccr',
        }),
        reactNodeId: 'elasticsearchCcrReact',
        getPageData,
        $scope,
        $injector,
      });

      $scope.$watch(
        () => this.data,
        (data) => {
          this.renderReact(data);
        }
      );

      this.renderReact = ({ data }) => {
        super.renderReact(<Ccr data={data} />);
      };
    }
  },
});
