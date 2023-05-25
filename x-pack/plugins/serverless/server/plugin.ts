/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { getConfigDirectory } from '@kbn/utils';
import { ProjectType } from '@kbn/serverless-types';

import { ServerlessPluginSetup, ServerlessPluginStart } from './types';
import { ServerlessConfig } from './config';
import { API_SWITCH_PROJECT } from '../common';

const switchBodySchema = schema.object({
  id: schema.oneOf([
    schema.literal('observability'),
    schema.literal('security'),
    schema.literal('search'),
  ]),
});

type SwitchReqBody = TypeOf<typeof switchBodySchema>;

const typeToIdMap: Record<ProjectType, string> = {
  observability: 'oblt',
  security: 'security',
  search: 'es',
};

export class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart> {
  private readonly config: ServerlessConfig;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get<ServerlessConfig>();
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const { developer } = this.config;

    // If we're in development mode, and the switcher is enabled, register the
    // API endpoint responsible for switching projects.
    if (process.env.NODE_ENV !== 'production' && developer?.projectSwitcher?.enabled) {
      router.post<void, void, SwitchReqBody>(
        {
          path: API_SWITCH_PROJECT,
          validate: {
            body: switchBodySchema,
          },
        },
        async (_context, request, response) => {
          const { id } = request.body;
          const selectedProjectType = typeToIdMap[id];

          try {
            // The switcher is not enabled by default, in cases where one has started Serverless
            // with a specific config.  So in this case, to ensure the switcher remains enabled,
            // write the selected config to `recent` and tack on the setting to enable the switcher.
            writeFileSync(
              resolve(getConfigDirectory(), 'serverless.recent.yml'),
              `xpack.serverless.plugin.developer.projectSwitcher.enabled: true\nserverless: ${selectedProjectType}\n`
            );

            return response.ok({ body: id });
          } catch (e) {
            return response.badRequest({ body: e });
          }
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
