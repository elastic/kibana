/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { Observable, combineLatest, AsyncSubject } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Server } from 'hapi';
import { once } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server';
import { makeApmUsageCollector } from './lib/apm_telemetry';
import { createApmAgentConfigurationIndex } from './lib/settings/agent_configuration/create_agent_config_index';
import { createApmApi } from './routes/create_apm_api';
import { getApmIndices } from './lib/settings/apm_indices/get_apm_indices';
import { APMConfig, mergeConfigs, APMXPackConfig } from '.';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { tutorialProvider } from './tutorial';
import { CloudSetup } from '../../cloud/server';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import { LicensingPluginSetup } from '../../licensing/public';

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
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.legacySetup$ = new AsyncSubject();
  }

  public async setup(
    core: CoreSetup,
    plugins: {
      apm_oss: APMOSSPluginSetup;
      home: HomeServerPluginSetup;
      licensing: LicensingPluginSetup;
      cloud?: CloudSetup;
      usageCollection?: UsageCollectionSetup;
    }
  ) {
    const logger = this.initContext.logger.get('apm');
    const config$ = this.initContext.config.create<APMXPackConfig>();
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
      logger
    });

    plugins.home.tutorials.registerTutorial(
      tutorialProvider({
        isEnabled: currentConfig['xpack.apm.ui.enabled'],
        indexPatternTitle: currentConfig['apm_oss.indexPattern'],
        cloud: plugins.cloud,
        indices: {
          errorIndices: currentConfig['apm_oss.errorIndices'],
          metricsIndices: currentConfig['apm_oss.metricsIndices'],
          onboardingIndices: currentConfig['apm_oss.onboardingIndices'],
          sourcemapIndices: currentConfig['apm_oss.sourcemapIndices'],
          transactionIndices: currentConfig['apm_oss.transactionIndices']
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
          config: currentConfig
        })
    };
  }

  public start() {}
  public stop() {}
}
