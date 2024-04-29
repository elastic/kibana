/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginBase, ServerRegisterOptions, Server } from '@hapi/hapi';

export interface EmulatorServerPluginRegisterOptions {
  router: Pick<Server, 'route'>;
}

export interface EmulatorServerPlugin extends Omit<PluginBase<unknown>, 'register'> {
  register: (options: EmulatorServerPluginRegisterOptions) => void | Promise<void>;
  name: string;
  /**
   * A prefix for the routes that will be registered via this plugin. Default is the plugin's `name`
   */
  prefix?: Required<ServerRegisterOptions>['routes']['prefix'];
}
