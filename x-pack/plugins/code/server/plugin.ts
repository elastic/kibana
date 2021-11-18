/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, Plugin, CoreSetup, DeprecationsDetails } from 'src/core/server';
import { CodeConfigSchema } from './config';

/**
 * Represents Code Plugin instance that will be managed by the Kibana plugin system.
 */
export class CodePlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup) {
    const config = this.initializerContext.config.get<TypeOf<typeof CodeConfigSchema>>();

    core.deprecations.registerDeprecations({
      getDeprecations: (context) => {
        const deprecations: DeprecationsDetails[] = [];
        if (config && Object.keys(config).length > 0) {
          deprecations.push({
            level: 'critical',
            deprecationType: 'feature',
            title: i18n.translate('xpack.code.deprecations.removed.title', {
              defaultMessage: 'The experimental plugin "Code" has been removed from Kibana',
            }),
            message: i18n.translate('xpack.code.deprecations.removed.message', {
              defaultMessage:
                'The experimental plugin "Code" has been removed from Kibana. The associated configuration ' +
                'properties need to be removed from the Kibana configuration file.',
            }),
            requireRestart: true,
            correctiveActions: {
              manualSteps: [
                i18n.translate('xpack.code.deprecations.removed.manualSteps1', {
                  defaultMessage: 'Remove all xpack.code.* properties from the Kibana config file.',
                }),
              ],
            },
          });
        }
        return deprecations;
      },
    });
  }

  public start() {}

  public stop() {}
}
