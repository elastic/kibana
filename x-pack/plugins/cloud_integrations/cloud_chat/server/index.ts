/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from '@kbn/core-plugins-server';

export { config } from './config';

// The plugin exists only to register the deprecated config keys and to be cleaned up in the future
export async function plugin() {
  class CloudChatPlugin implements Plugin {
    constructor() {}

    public setup() {}

    public start() {}

    public stop() {}
  }

  return new CloudChatPlugin();
}
