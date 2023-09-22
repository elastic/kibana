/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';

export class StandalonePlugin {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup) {
    const router = core.http.createRouter();

    router.get({ path: '/standalone.js', validate: {} }, async (context, request, response) => {
      const files = await readdir(resolve(__dirname, '../external/public/dist/assets'));
      const index = files.find((file) => file.endsWith('.js'));
      const script = await readFile(
        resolve(__dirname, `../external/public/dist/assets/${index}`),
        'utf8'
      );
      return response.ok({
        body: script,
        headers: {
          'content-type': 'application/javascript',
        },
      });
    });

    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
