/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import template from './index.html';
import { ElasticsearchOverviewController } from './controller';
import { CODE_PATH_ELASTICSEARCH } from '../../../../common/constants';

uiRoutes.when('/elasticsearch', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
  },
  controllerAs: 'elasticsearchOverview',
  controller: ElasticsearchOverviewController,
});
