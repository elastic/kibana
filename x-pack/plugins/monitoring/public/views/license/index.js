/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiRoutes } from '../../angular/helpers/routes';
import { routeInitProvider } from '../../lib/route_init';
import template from './index.html';
import { LicenseViewController } from './controller';
import { CODE_PATH_LICENSE } from '../../../common/constants';

uiRoutes.when('/license', {
  template,
  resolve: {
    clusters: (Private) => {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LICENSE] });
    },
  },
  controllerAs: 'licenseView',
  controller: LicenseViewController,
});
