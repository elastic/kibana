/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { xpackWatcherActionDefaultsService } from './action_defaults_service';

import './actions/email_action';
import './actions/logging_action';
import './actions/slack_action';

uiModules.get('xpack/watcher')
  .factory('xpackWatcherActionDefaultsService', ($injector) => {
    const config = $injector.get('config');

    return xpackWatcherActionDefaultsService(config);
  });
