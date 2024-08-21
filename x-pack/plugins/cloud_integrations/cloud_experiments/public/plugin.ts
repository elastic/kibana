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
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Logger } from '@kbn/logging';

import { LaunchDarklyClient, type LaunchDarklyClientConfig } from './launch_darkly_client';
import type {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsMetric,
  CloudExperimentsPluginStart,
} from '../common';
import { MetadataService } from '../common/metadata_service';
import { FEATURE_FLAG_NAMES, METRIC_NAMES } from '../common/constants';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
}

interface CloudExperimentsPluginStartDeps {
  cloud: CloudStart;
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
  private readonly kibanaVersion: string;
  private readonly flagOverrides?: Record<string, unknown>;
  private readonly isDev: boolean;

  /** Constructor of the plugin **/
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.kibanaVersion = initializerContext.env.packageInfo.version;
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
      this.launchDarklyClient = new LaunchDarklyClient(ldConfig, this.kibanaVersion, this.logger);
    }
  }

  /**
   * Sets up the A/B testing client only if cloud is enabled
   * @param core {@link CoreSetup}
   * @param deps {@link CloudExperimentsPluginSetupDeps}
   */
  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    if (deps.cloud.isCloudEnabled && deps.cloud.deploymentId && this.launchDarklyClient) {
      this.metadataService.setup({
        userId: deps.cloud.deploymentId,
        kibanaVersion: this.kibanaVersion,
        trialEndDate: deps.cloud.trialEndDate?.toISOString(),
        isElasticStaff: deps.cloud.isElasticStaffOwned,
      });
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
    { cloud, dataViews }: CloudExperimentsPluginStartDeps
  ): CloudExperimentsPluginStart {
    if (cloud.isCloudEnabled) {
      this.metadataService.start({
        hasDataFetcher: async () => ({ hasData: await dataViews.hasData.hasUserDataView() }),
      });

      // We only subscribe to the user metadata updates if Cloud is enabled.
      // This way, since the user is not identified, it cannot retrieve Feature Flags from LaunchDarkly when not running on Cloud.
      this.metadataService.userMetadata$
        .pipe(
          // Using concatMap to ensure we call the promised update in an orderly manner to avoid concurrency issues
          concatMap(
            async (userMetadata) => await this.launchDarklyClient?.updateUserMetadata(userMetadata)
          )
        )
        .subscribe(); // This subscription will stop on when the metadataService stops because it completes the Observable
    }
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
}
