/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uiRoutes from 'ui/routes';
import { getPageData } from './get_page_data';
import template from './index.html';
import { Ccr } from '../../../components/elasticsearch/ccr';
import { MonitoringViewBaseController } from '../../base_controller';

uiRoutes.when('/elasticsearch/ccr', {
  template,
  resolve: {
    pageData: getPageData,
  },
  controllerAs: 'elasticsearchCcr',
  controller: class ElasticsearchCcrController extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        title: 'Elasticsearch - Ccr',
        reactNodeId: 'elasticsearchCcrReact',
        getPageData,
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });

      this.renderReact = ({ data }) => {
        super.renderReact(
          <Ccr data={data} />
        );
      };
    }
  }
});
