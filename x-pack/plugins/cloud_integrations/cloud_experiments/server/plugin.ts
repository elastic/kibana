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
import LaunchDarkly, { type LDClient, type LDUser } from 'launchdarkly-node-server-sdk';
import { createSHA256Hash } from '@kbn/crypto';
import type { LogMeta } from '@kbn/logging';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
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

export class CloudExperimentsPlugin
  implements Plugin<void, CloudExperimentsPluginStart, CloudExperimentsPluginSetupDeps>
{
  private readonly logger: Logger;
  private readonly launchDarklyClient?: LDClient;
  private readonly flagOverrides?: Record<string, unknown>;
  private launchDarklyUser: LDUser | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<CloudExperimentsConfigType>();
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
      this.launchDarklyClient = LaunchDarkly.init(ldConfig.sdk_key, {
        application: { id: `kibana-server`, version: initializerContext.env.packageInfo.version },
        logger: LaunchDarkly.basicLogger({ level: ldConfig.client_log_level }),
        // For some reason, the stream API does not work in Kibana. `.waitForInitialization()` hangs forever (doesn't throw, neither logs any errors).
        // Using polling for now until we resolve that issue.
        // Relevant issue: https://github.com/launchdarkly/node-server-sdk/issues/132
        stream: false,
      });
      this.launchDarklyClient.waitForInitialization().then(
        () => this.logger.debug('LaunchDarkly is initialized!'),
        (err) => this.logger.warn(`Error initializing LaunchDarkly: ${err}`)
      );
    }
  }

  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    if (deps.usageCollection) {
      registerUsageCollector(deps.usageCollection, () => ({
        launchDarklyClient: this.launchDarklyClient,
        launchDarklyUser: this.launchDarklyUser,
      }));
    }

    if (deps.cloud.isCloudEnabled && deps.cloud.cloudId) {
      this.launchDarklyUser = {
        // We use the Cloud ID as the userId in the Cloud Experiments
        key: createSHA256Hash(deps.cloud.cloudId),
        custom: {
          // This list of deployment metadata will likely grow in future versions
          kibanaVersion: this.initializerContext.env.packageInfo.version,
        },
      };
      this.launchDarklyClient?.identify(this.launchDarklyUser);
    }
  }

  public start(core: CoreStart) {
    return {
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
  }

  public stop() {
    this.launchDarklyClient?.flush().catch((err) => this.logger.error(err));
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
    if (!this.launchDarklyUser) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient?.waitForInitialization();
    return await this.launchDarklyClient?.variation(configKey, this.launchDarklyUser, defaultValue);
  };

  private reportMetric = <Data>({ name, meta, value }: CloudExperimentsMetric<Data>): void => {
    const metricName = METRIC_NAMES[name];
    if (!this.launchDarklyUser) return; // Skip any action if no LD User is defined
    this.launchDarklyClient?.track(metricName, this.launchDarklyUser, meta, value);
    this.logger.debug<{ experimentationMetric: CloudExperimentsMetric<Data> } & LogMeta>(
      `Reported experimentation metric ${metricName}`,
      {
        experimentationMetric: { name, meta, value },
      }
    );
  };
}
