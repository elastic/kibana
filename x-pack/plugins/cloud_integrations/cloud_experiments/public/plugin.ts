/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { LaunchDarklyClientProvider } from '@openfeature/launchdarkly-client-provider';
import { type LDLogLevel, basicLogger } from 'launchdarkly-js-client-sdk';
import { initializeMetadata, MetadataService } from '../common/metadata_service';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
}

interface CloudExperimentsPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
}

interface LaunchDarklyClientConfig {
  client_id: string;
  client_log_level: LDLogLevel;
}

/**
 * Browser-side implementation of the Cloud Experiments plugin
 */
export class CloudExperimentsPlugin
  implements Plugin<void, void, CloudExperimentsPluginSetupDeps, CloudExperimentsPluginStartDeps>
{
  private readonly logger: Logger;
  private readonly metadataService: MetadataService;

  /** Constructor of the plugin **/
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<{
      launch_darkly?: LaunchDarklyClientConfig;
      metadata_refresh_interval: string;
    }>();

    this.metadataService = new MetadataService(
      { metadata_refresh_interval: duration(config.metadata_refresh_interval) },
      this.logger.get('metadata')
    );

    const ldConfig = config.launch_darkly;
    if (!ldConfig?.client_id && !initializerContext.env.mode.dev) {
      // If the plugin is enabled, and it's in prod mode, launch_darkly must exist
      // (config-schema should enforce it, but just in case).
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    }
  }

  /**
   * Sets up the A/B testing client only if cloud is enabled
   * @param core {@link CoreSetup}
   * @param deps {@link CloudExperimentsPluginSetupDeps}
   */
  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    initializeMetadata({
      metadataService: this.metadataService,
      initializerContext: this.initializerContext,
      cloud: deps.cloud,
      featureFlags: core.featureFlags,
      logger: this.logger,
    });

    const launchDarklyOpenFeatureProvider = this.createOpenFeatureProvider();
    if (launchDarklyOpenFeatureProvider) {
      core.featureFlags.setProvider(launchDarklyOpenFeatureProvider);
    }
  }

  /**
   * Sets the metadata service update hooks
   * @param core {@link CoreStart}
   * @param deps {@link CloudExperimentsPluginStartDeps}
   */
  public start(core: CoreStart, { dataViews }: CloudExperimentsPluginStartDeps) {
    this.metadataService.start({
      hasDataFetcher: async () => ({ has_data: await dataViews.hasData.hasUserDataView() }),
    });
  }

  /**
   * Cleans up and flush the sending queues.
   */
  public stop() {
    this.metadataService.stop();
  }

  /**
   * Sets up the OpenFeature LaunchDarkly provider
   * @private
   */
  private createOpenFeatureProvider() {
    const { launch_darkly: ldConfig } = this.initializerContext.config.get<{
      launch_darkly?: LaunchDarklyClientConfig;
    }>();

    if (!ldConfig) return;

    return new LaunchDarklyClientProvider(ldConfig.client_id, {
      // logger: this.logger.get('launch-darkly'),
      // Using basicLogger for now because we can't limit the level for now if we're using core's logger.
      logger: basicLogger({ level: ldConfig.client_log_level }),
      streaming: true, // Necessary to react to flag changes
      application: {
        id: 'kibana-browser',
        version:
          this.initializerContext.env.packageInfo.buildFlavor === 'serverless'
            ? this.initializerContext.env.packageInfo.buildSha
            : this.initializerContext.env.packageInfo.version,
      },
    });
  }
}
