/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiRoutes } from '../../angular/helpers/routes';
import template from './index.html';
import { NoDataController } from './controller';

uiRoutes.when('/no-data', {
  template,
  controller: NoDataController,
});
