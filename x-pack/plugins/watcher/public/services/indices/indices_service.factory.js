/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { IndicesService } from './indices_service';

uiModules.get('xpack/watcher')
  .factory('xpackWatcherIndicesService', ($injector) => {
    const $http = $injector.get('$http');
    return new IndicesService($http);
  });
