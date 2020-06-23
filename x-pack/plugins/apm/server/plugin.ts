/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
} from 'src/core/server';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ObservabilityPluginSetup } from '../../observability/server';
import { SecurityPluginSetup } from '../../security/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { TaskManagerSetupContract } from '../../task_manager/server';
import { AlertingPlugin } from '../../alerts/server';
import { ActionsPlugin } from '../../actions/server';
import { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server';
import { createApmAgentConfigurationIndex } from './lib/settings/agent_configuration/create_agent_config_index';
import { createApmCustomLinkIndex } from './lib/settings/custom_link/create_custom_link_index';
import { createApmApi } from './routes/create_apm_api';
import { getApmIndices } from './lib/settings/apm_indices/get_apm_indices';
import { APMConfig, mergeConfigs, APMXPackConfig } from '.';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { CloudSetup } from '../../cloud/server';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import {
  LicensingPluginSetup,
  LicensingPluginStart,
} from '../../licensing/server';
import { registerApmAlerts } from './lib/alerts/register_apm_alerts';
import { createApmTelemetry } from './lib/apm_telemetry';

import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import {
  APM_FEATURE,
  APM_SERVICE_MAPS_FEATURE_NAME,
  APM_SERVICE_MAPS_LICENSE_TYPE,
} from './feature';
import { apmIndices, apmTelemetry } from './saved_objects';
import { createElasticCloudInstructions } from './tutorial/elastic_cloud';
import { MlPluginSetup } from '../../ml/server';

export interface APMPluginSetup {
  config$: Observable<APMConfig>;
  getApmIndices: () => ReturnType<typeof getApmIndices>;
}

export class APMPlugin implements Plugin<APMPluginSetup> {
  private currentConfig?: APMConfig;
  private logger?: Logger;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public async setup(
    core: CoreSetup,
    plugins: {
      apmOss: APMOSSPluginSetup;
      home: HomeServerPluginSetup;
      licensing: LicensingPluginSetup;
      cloud?: CloudSetup;
      usageCollection?: UsageCollectionSetup;
      taskManager?: TaskManagerSetupContract;
      alerts?: AlertingPlugin['setup'];
      actions?: ActionsPlugin['setup'];
      observability?: ObservabilityPluginSetup;
      features: FeaturesPluginSetup;
      security?: SecurityPluginSetup;
      ml?: MlPluginSetup;
    }
  ) {
    this.logger = this.initContext.logger.get();
    const config$ = this.initContext.config.create<APMXPackConfig>();
    const mergedConfig$ = combineLatest(plugins.apmOss.config$, config$).pipe(
      map(([apmOssConfig, apmConfig]) => mergeConfigs(apmOssConfig, apmConfig))
    );

    core.savedObjects.registerType(apmIndices);
    core.savedObjects.registerType(apmTelemetry);

    if (plugins.actions && plugins.alerts) {
      registerApmAlerts({
        alerts: plugins.alerts,
        actions: plugins.actions,
        config$: mergedConfig$,
      });
    }

    this.currentConfig = await mergedConfig$.pipe(take(1)).toPromise();

    if (
      plugins.taskManager &&
      plugins.usageCollection &&
      this.currentConfig['xpack.apm.telemetryCollectionEnabled']
    ) {
      createApmTelemetry({
        core,
        config$: mergedConfig$,
        usageCollector: plugins.usageCollection,
        taskManager: plugins.taskManager,
        logger: this.logger,
      });
    }

    const ossTutorialProvider = plugins.apmOss.getRegisteredTutorialProvider();
    plugins.home.tutorials.unregisterTutorial(ossTutorialProvider);
    plugins.home.tutorials.registerTutorial(() => {
      const ossPart = ossTutorialProvider({});
      if (this.currentConfig!['xpack.apm.ui.enabled'] && ossPart.artifacts) {
        ossPart.artifacts.application = {
          path: '/app/apm',
          label: i18n.translate(
            'xpack.apm.tutorial.specProvider.artifacts.application.label',
            {
              defaultMessage: 'Launch APM',
            }
          ),
        };
      }

      return {
        ...ossPart,
        elasticCloud: createElasticCloudInstructions(plugins.cloud),
      };
    });

    plugins.features.registerFeature(APM_FEATURE);
    plugins.licensing.featureUsage.register(
      APM_SERVICE_MAPS_FEATURE_NAME,
      APM_SERVICE_MAPS_LICENSE_TYPE
    );

    core.getStartServices().then(([_coreStart, pluginsStart]) => {
      createApmApi().init(core, {
        config$: mergedConfig$,
        logger: this.logger!,
        plugins: {
          licensing: (pluginsStart as { licensing: LicensingPluginStart })
            .licensing,
          observability: plugins.observability,
          security: plugins.security,
          ml: plugins.ml,
        },
      });
    });

    return {
      config$: mergedConfig$,
      getApmIndices: async () =>
        getApmIndices({
          savedObjectsClient: await getInternalSavedObjectsClient(core),
          config: await mergedConfig$.pipe(take(1)).toPromise(),
        }),
    };
  }

  public start(core: CoreStart) {
    if (this.currentConfig == null || this.logger == null) {
      throw new Error('APMPlugin needs to be setup before calling start()');
    }

    // create agent configuration index without blocking start lifecycle
    createApmAgentConfigurationIndex({
      esClient: core.elasticsearch.legacy.client,
      config: this.currentConfig,
      logger: this.logger,
    });
    // create custom action index without blocking start lifecycle
    createApmCustomLinkIndex({
      esClient: core.elasticsearch.legacy.client,
      config: this.currentConfig,
      logger: this.logger,
    });
  }

  public stop() {}
}
