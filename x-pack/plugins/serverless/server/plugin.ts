/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyFileSync, existsSync } from 'fs';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

import { schema, TypeOf } from '@kbn/config-schema';
import { getConfigDirectory } from '@kbn/utils';
import { resolve } from 'path';
import { ServerlessPluginSetup, ServerlessPluginStart } from './types';
import { API_SWITCH_PROJECT } from '../common';

const switchBodySchema = schema.object({
  id: schema.string(),
});

type SwitchReqBody = TypeOf<typeof switchBodySchema>;

export class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart> {
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    if (process.env.NODE_ENV !== 'production') {
      router.post<void, void, SwitchReqBody>(
        {
          path: API_SWITCH_PROJECT,
          validate: {
            body: switchBodySchema,
          },
        },
        async (_context, request, response) => {
          const { id } = request.body;
          const path = resolve(getConfigDirectory(), `serverless.${id}.yml`);

          try {
            if (existsSync(path)) {
              copyFileSync(path, resolve(getConfigDirectory(), 'serverless.recent.yml'));
              return response.ok({ body: id });
            }
          } catch (e) {
            return response.badRequest({ body: e });
          }

          return response.badRequest();
        }
      );
    }

    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
