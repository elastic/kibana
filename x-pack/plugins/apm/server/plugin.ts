/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { Observable, combineLatest, AsyncSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Server } from 'hapi';
import { once } from 'lodash';
import { Plugin as APMOSSPlugin } from '../../../../src/plugins/apm_oss/server';
import { createApmAgentConfigurationIndex } from '../../../legacy/plugins/apm/server/lib/settings/agent_configuration/create_agent_config_index';
import { createApmApi } from '../../../legacy/plugins/apm/server/routes/create_apm_api';
import { APMConfig, mergeConfigs, APMXPackConfig } from '.';

export interface LegacySetup {
  server: Server;
}

export interface APMPluginContract {
  config$: Observable<APMConfig>;
  registerLegacyAPI: (__LEGACY: LegacySetup) => void;
}

export class APMPlugin implements Plugin<APMPluginContract> {
  legacySetup$: AsyncSubject<LegacySetup>;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.legacySetup$ = new AsyncSubject();
  }

  public setup(
    core: CoreSetup,
    plugins: {
      apm_oss: APMOSSPlugin extends Plugin<infer TSetup> ? TSetup : never;
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

    combineLatest(mergedConfig$, core.elasticsearch.dataClient$).subscribe(
      ([config, dataClient]) => {
        createApmAgentConfigurationIndex({
          esClient: dataClient,
          config,
        });
      }
    );

    return {
      config$: mergedConfig$,
      registerLegacyAPI: once((__LEGACY: LegacySetup) => {
        this.legacySetup$.next(__LEGACY);
        this.legacySetup$.complete();
      }),
    };
  }

  public start() {}
  public stop() {}
}
