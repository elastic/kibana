/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CONFIG_ROLLUPS } from '../common';

export class RollupPlugin implements Plugin<RollupSetup> {
  private readonly initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup) {
    core.uiSettings.register({
      [CONFIG_ROLLUPS]: {
        name: i18n.translate('xpack.rollupJobs.rollupIndexPatternsTitle', {
          defaultMessage: 'Enable rollup index patterns',
        }),
        value: true,
        description: i18n.translate('xpack.rollupJobs.rollupIndexPatternsDescription', {
          defaultMessage: `Enable the creation of index patterns which capture rollup indices,
              which in turn enable visualizations based on rollup data. Refresh
              the page to apply the changes.`,
        }),
        category: ['rollups'],
        schema: schema.boolean(),
      },
    });

    return {
      __legacy: {
        config: this.initContext.config,
        logger: this.initContext.logger,
      },
    };
  }

  public start() {}
  public stop() {}
}

export interface RollupSetup {
  /** @deprecated */
  __legacy: {
    config: PluginInitializerContext['config'];
    logger: PluginInitializerContext['logger'];
  };
}
