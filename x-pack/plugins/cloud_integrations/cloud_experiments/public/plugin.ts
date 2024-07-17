/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { get, has } from 'lodash';
import { duration } from 'moment';
import { concatMap } from 'rxjs';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Logger } from '@kbn/logging';

import { LaunchDarklyClientProvider } from '@openfeature/launchdarkly-client-provider';
import { ClientProviderEvents } from '@openfeature/core';
import type { LDMultiKindContext } from 'launchdarkly-js-client-sdk';
import { LaunchDarklyClient, type LaunchDarklyClientConfig } from './launch_darkly_client';
import type {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsMetric,
  CloudExperimentsPluginStart,
} from '../common';
import { initializeMetadata, MetadataService } from '../common/metadata_service';
import { FEATURE_FLAG_NAMES, METRIC_NAMES } from '../common/constants';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
}

interface CloudExperimentsPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
}

/**
 * Browser-side implementation of the Cloud Experiments plugin
 */
export class CloudExperimentsPlugin
  implements Plugin<void, CloudExperimentsPluginStart, CloudExperimentsPluginSetupDeps>
{
  private readonly logger: Logger;
  private readonly metadataService: MetadataService;
  private readonly launchDarklyClient?: LaunchDarklyClient;
  private readonly flagOverrides?: Record<string, unknown>;
  private readonly isDev: boolean;

  /** Constructor of the plugin **/
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    const config = initializerContext.config.get<{
      launch_darkly?: LaunchDarklyClientConfig;
      flag_overrides?: Record<string, unknown>;
      metadata_refresh_interval: string;
    }>();

    this.metadataService = new MetadataService(
      { metadata_refresh_interval: duration(config.metadata_refresh_interval) },
      this.logger.get('metadata')
    );

    if (config.flag_overrides) {
      this.flagOverrides = config.flag_overrides;
    }
    const ldConfig = config.launch_darkly;
    if (!ldConfig?.client_id && !initializerContext.env.mode.dev) {
      // If the plugin is enabled, and it's in prod mode, launch_darkly must exist
      // (config-schema should enforce it, but just in case).
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    }
    if (ldConfig?.client_id) {
      // Disabled to make it easier for manual tests of the new client
      // this.launchDarklyClient = new LaunchDarklyClient(
      //   ldConfig,
      //   this.initializerContext.env.packageInfo.version,
      //   this.logger
      // );
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
    core.featureFlags.setProvider(this.createOpenFeatureProvider());

    // TODO: Legacy client. Remove when the migration is complete
    if (deps.cloud.isCloudEnabled && deps.cloud.deploymentId && this.launchDarklyClient) {
      // Update the client's contexts when we get any updates in the metadata.
      this.metadataService.userMetadata$
        .pipe(
          // Using concatMap to ensure we call the promised update in an orderly manner to avoid concurrency issues
          concatMap(async (userMetadata) => {
            try {
              await this.launchDarklyClient?.updateUserMetadata(userMetadata as LDMultiKindContext);
            } catch (err) {
              this.logger.warn(`Failed to set the context in the legacy client ${err}`);
            }
          })
        )
        .subscribe(); // This subscription will stop on when the metadataService stops because it completes the Observable
    } else {
      this.launchDarklyClient?.cancel();
    }
  }

  /**
   * Returns the contract {@link CloudExperimentsPluginStart}
   * @param core {@link CoreStart}
   */
  public start(
    core: CoreStart,
    { dataViews }: CloudExperimentsPluginStartDeps
  ): CloudExperimentsPluginStart {
    this.logger.info(
      `The value is ${core.featureFlags.getStringValue('building-materials', 'fallback')}`
    );

    core.featureFlags.addHandler(ClientProviderEvents.ConfigurationChanged, (event) => {
      this.logger.info(`[Configuration changed] Flags changed! ${event?.flagsChanged}`);
      this.logger.info(
        `[Configuration changed] The value now is ${core.featureFlags.getStringValue(
          'building-materials',
          'fallback'
        )}`
      );
    });

    this.metadataService.start({
      hasDataFetcher: async () => ({ has_data: await dataViews.hasData.hasUserDataView() }),
    });

    return {
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
  }

  /**
   * Cleans up and flush the sending queues.
   */
  public stop() {
    this.launchDarklyClient?.stop();
    this.metadataService.stop();
  }

  private getVariation = async <Data>(
    featureFlagName: CloudExperimentsFeatureFlagNames,
    defaultValue: Data
  ): Promise<Data> => {
    const configKey = FEATURE_FLAG_NAMES[featureFlagName];

    // Apply overrides if they exist without asking LaunchDarkly.
    if (this.flagOverrides && has(this.flagOverrides, configKey)) {
      return get(this.flagOverrides, configKey, defaultValue) as Data;
    }

    // Skip any action if no LD Client is defined
    if (!this.launchDarklyClient) {
      return defaultValue;
    }

    return await this.launchDarklyClient.getVariation(configKey, defaultValue);
  };

  private reportMetric = <Data>({ name, meta, value }: CloudExperimentsMetric<Data>): void => {
    const metricName = METRIC_NAMES[name];
    this.launchDarklyClient?.reportMetric(metricName, meta, value);
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.debug(`Reported experimentation metric ${metricName}`, {
        experimentationMetric: { name, meta, value },
      });
    }
  };

  private createOpenFeatureProvider() {
    const { launch_darkly: ldConfig } = this.initializerContext.config.get<{
      launch_darkly: LaunchDarklyClientConfig;
    }>();

    return new LaunchDarklyClientProvider(ldConfig.client_id, {
      logger: this.logger.get('launch-darkly'),
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
