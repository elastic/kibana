/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { config } from './config';
import { init } from './init';

/**
 * Invokes plugin modules to instantiate the Notification plugin for Kibana
 *
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Notification Kibana plugin object
 */
export const notifications = (kibana: any) =>
  new kibana.Plugin({
    require: ['kibana', 'xpack_main'],
    id: 'notifications',
    configPrefix: 'xpack.notifications',
    publicDir: resolve(__dirname, 'public'),
    init,
    config,
  });
