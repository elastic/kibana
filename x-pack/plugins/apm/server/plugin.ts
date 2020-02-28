/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  SavedObjectsClientContract,
} from 'src/core/server';
import { Observable, combineLatest, AsyncSubject } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Server } from 'hapi';
import { once } from 'lodash';
import { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server';
import { createApmAgentConfigurationIndex } from '../../../legacy/plugins/apm/server/lib/settings/agent_configuration/create_agent_config_index';
import { createApmApi } from '../../../legacy/plugins/apm/server/routes/create_apm_api';
import { getApmIndices } from '../../../legacy/plugins/apm/server/lib/settings/apm_indices/get_apm_indices';
import { APMConfig, mergeConfigs, APMXPackConfig } from '.';

export interface LegacySetup {
  server: Server;
}

export interface APMPluginContract {
  config$: Observable<APMConfig>;
  registerLegacyAPI: (__LEGACY: LegacySetup) => void;
  getApmIndices: (
    savedObjectsClient: SavedObjectsClientContract
  ) => ReturnType<typeof getApmIndices>;
}

export class APMPlugin implements Plugin<APMPluginContract> {
  legacySetup$: AsyncSubject<LegacySetup>;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.legacySetup$ = new AsyncSubject();
  }

  public async setup(
    core: CoreSetup,
    plugins: {
      apm_oss: APMOSSPluginSetup;
    }
  ) {
    const config$ = this.initContext.config.create<APMXPackConfig>();
    const logger = this.initContext.logger.get('apm');
    const mergedConfig$ = combineLatest(plugins.apm_oss.config$, config$).pipe(
      map(([apmOssConfig, apmConfig]) => mergeConfigs(apmOssConfig, apmConfig))
    );

    this.legacySetup$.subscribe(__LEGACY => {
      createApmApi().init(core, { config$: mergedConfig$, logger, __LEGACY });
    });

    const currentConfig = await mergedConfig$.pipe(take(1)).toPromise();

    // create agent configuration index without blocking setup lifecycle
    createApmAgentConfigurationIndex({
      esClient: core.elasticsearch.dataClient,
      config: currentConfig,
    });

    return {
      config$: mergedConfig$,
      registerLegacyAPI: once((__LEGACY: LegacySetup) => {
        this.legacySetup$.next(__LEGACY);
        this.legacySetup$.complete();
      }),
      getApmIndices: async (savedObjectsClient: SavedObjectsClientContract) => {
        return getApmIndices({ savedObjectsClient, config: currentConfig });
      },
    };
  }

  public start() {}
  public stop() {}
}
