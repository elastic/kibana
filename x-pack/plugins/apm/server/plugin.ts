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
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { makeApmUsageCollector } from './lib/apm_telemetry';
import { Plugin as APMOSSPlugin } from '../../../../src/plugins/apm_oss/server';
import { createApmAgentConfigurationIndex } from './lib/settings/agent_configuration/create_agent_config_index';
import { createApmApi } from './routes/create_apm_api';
import { getApmIndices } from './lib/settings/apm_indices/get_apm_indices';
import { APMConfig, mergeConfigs, APMXPackConfig } from '.';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { tutorialProvider } from './tutorial';
import { CloudSetup } from '../../cloud/server';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';

export interface LegacySetup {
  server: Server;
}

export interface APMPluginContract {
  config$: Observable<APMConfig>;
  registerLegacyAPI: (__LEGACY: LegacySetup) => void;
  getApmIndices: () => ReturnType<typeof getApmIndices>;
}

export class APMPlugin implements Plugin<APMPluginContract> {
  legacySetup$: AsyncSubject<LegacySetup>;
  currentConfig: APMConfig;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.legacySetup$ = new AsyncSubject();
    this.currentConfig = {} as APMConfig;
  }

  public async setup(
    core: CoreSetup,
    plugins: {
      apm_oss: APMOSSPlugin extends Plugin<infer TSetup> ? TSetup : never;
      home: HomeServerPluginSetup;
      cloud?: CloudSetup;
      usageCollection?: UsageCollectionSetup;
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

    await new Promise(resolve => {
      mergedConfig$.subscribe(async config => {
        this.currentConfig = config;
        await createApmAgentConfigurationIndex({
          esClient: core.elasticsearch.dataClient,
          config
        });
        resolve();
      });
    });

    plugins.home.tutorials.registerTutorial(
      tutorialProvider({
        isEnabled: this.currentConfig['xpack.apm.ui.enabled'],
        indexPatternTitle: this.currentConfig['apm_oss.indexPattern'],
        cloud: plugins.cloud,
        indices: {
          errorIndices: this.currentConfig['apm_oss.errorIndices'],
          metricsIndices: this.currentConfig['apm_oss.metricsIndices'],
          onboardingIndices: this.currentConfig['apm_oss.onboardingIndices'],
          sourcemapIndices: this.currentConfig['apm_oss.sourcemapIndices'],
          transactionIndices: this.currentConfig['apm_oss.transactionIndices']
        }
      })
    );

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      getInternalSavedObjectsClient(core)
        .then(savedObjectsClient => {
          makeApmUsageCollector(usageCollection, savedObjectsClient);
        })
        .catch(error => {
          logger.error('Unable to initialize use collection');
          logger.error(error.message);
        });
    }

    return {
      config$: mergedConfig$,
      registerLegacyAPI: once((__LEGACY: LegacySetup) => {
        this.legacySetup$.next(__LEGACY);
        this.legacySetup$.complete();
      }),
      getApmIndices: async () =>
        getApmIndices({
          savedObjectsClient: await getInternalSavedObjectsClient(core),
          config: this.currentConfig
        })
    };
  }

  public start() {}
  public stop() {}
}
