/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { XpackWatcherTimezoneService } from './xpack_watcher_timezone_service';

uiModules.get('xpack/watcher')
  .factory('xpackWatcherTimezoneService', ($injector) => {
    const config = $injector.get('config');
    return new XpackWatcherTimezoneService(config);
  });
