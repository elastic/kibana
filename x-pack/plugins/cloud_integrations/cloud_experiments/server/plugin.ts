/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { get, has } from 'lodash';
import { createSHA256Hash } from '@kbn/crypto';
import type { LogMeta } from '@kbn/logging';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server/types';
import { filter, map } from 'rxjs';
import { MetadataService } from '../common/metadata_service';
import { LaunchDarklyClient } from './launch_darkly_client';
import { registerUsageCollector } from './usage';
import type { CloudExperimentsConfigType } from './config';
import type {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsMetric,
  CloudExperimentsPluginStart,
} from '../common';
import { FEATURE_FLAG_NAMES, METRIC_NAMES } from '../common/constants';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

interface CloudExperimentsPluginStartDeps {
  dataViews: DataViewsServerPluginStart;
}

export class CloudExperimentsPlugin
  implements Plugin<void, CloudExperimentsPluginStart, CloudExperimentsPluginSetupDeps>
{
  private readonly logger: Logger;
  private readonly launchDarklyClient?: LaunchDarklyClient;
  private readonly flagOverrides?: Record<string, unknown>;
  private readonly metadataService: MetadataService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<CloudExperimentsConfigType>();

    this.metadataService = new MetadataService({
      metadata_refresh_interval: config.metadata_refresh_interval,
    });

    if (config.flag_overrides) {
      this.flagOverrides = config.flag_overrides;
    }
    const ldConfig = config.launch_darkly; // If the plugin is enabled and no flag_overrides are provided (dev mode only), launch_darkly must exist
    if (!ldConfig && !initializerContext.env.mode.dev) {
      // If the plugin is enabled, and it's in prod mode, launch_darkly must exist
      // (config-schema should enforce it, but just in case).
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    }
    if (ldConfig) {
      this.launchDarklyClient = new LaunchDarklyClient(
        {
          ...ldConfig,
          kibana_version: initializerContext.env.packageInfo.version,
        },
        this.logger.get('launch_darkly')
      );
    }
  }

  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    if (deps.usageCollection) {
      registerUsageCollector(deps.usageCollection, () => ({
        launchDarklyClient: this.launchDarklyClient,
      }));
    }

    if (deps.cloud.isCloudEnabled && deps.cloud.cloudId) {
      this.metadataService.setup({
        // We use the Cloud ID as the userId in the Cloud Experiments
        userId: createSHA256Hash(deps.cloud.cloudId),
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        trialEndDate: deps.cloud.trialEndDate?.toISOString(),
        isElasticStaff: deps.cloud.isElasticStaffOwned,
      });

      // We only subscribe to the user metadata updates if Cloud is enabled.
      // This way, since the user is not identified, it cannot retrieve Feature Flags from LaunchDarkly when not running on Cloud.
      this.metadataService.userMetadata$
        .pipe(
          filter(Boolean), // Filter out undefined
          map((userMetadata) => this.launchDarklyClient?.updateUserMetadata(userMetadata))
        )
        .subscribe(); // This subscription will stop on when the metadataService stops because it completes the Observable
    }
  }

  public start(core: CoreStart, deps: CloudExperimentsPluginStartDeps) {
    this.metadataService.start({
      hasDataFetcher: async () => await this.addHasDataMetadata(core, deps.dataViews),
    });
    return {
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
  }

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
    if (!this.launchDarklyClient) return defaultValue;
    return await this.launchDarklyClient.getVariation(configKey, defaultValue);
  };

  private reportMetric = <Data>({ name, meta, value }: CloudExperimentsMetric<Data>): void => {
    const metricName = METRIC_NAMES[name];
    this.launchDarklyClient?.reportMetric(metricName, meta, value);
    this.logger.debug<{ experimentationMetric: CloudExperimentsMetric<Data> } & LogMeta>(
      `Reported experimentation metric ${metricName}`,
      {
        experimentationMetric: { name, meta, value },
      }
    );
  };

  private async addHasDataMetadata(
    core: CoreStart,
    dataViews: DataViewsServerPluginStart
  ): Promise<{ hasData: boolean }> {
    const dataViewsService = await dataViews.dataViewsServiceFactory(
      core.savedObjects.createInternalRepository(),
      core.elasticsearch.client.asInternalUser,
      void 0, // No Kibana Request to scope the check
      true // Ignore capabilities checks
    );
    return {
      hasData: await dataViewsService.hasUserDataView(),
    };
  }
}
