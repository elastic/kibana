/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LDClient } from 'launchdarkly-js-client-sdk';
import { get, has } from 'lodash';
import { Sha256 } from '@kbn/crypto-browser';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsMetric,
  CloudExperimentsPluginStart,
} from '../common';
import { FEATURE_FLAG_NAMES, METRIC_NAMES } from '../common/constants';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
}

/**
 * Browser-side implementation of the Cloud Experiments plugin
 */
export class CloudExperimentsPlugin
  implements Plugin<void, CloudExperimentsPluginStart, CloudExperimentsPluginSetupDeps>
{
  private launchDarklyClient?: LDClient;
  private readonly clientId?: string;
  private readonly kibanaVersion: string;
  private readonly flagOverrides?: Record<string, unknown>;
  private readonly isDev: boolean;

  /** Constructor of the plugin **/
  constructor(initializerContext: PluginInitializerContext) {
    this.isDev = initializerContext.env.mode.dev;
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    const config = initializerContext.config.get<{
      launch_darkly?: { client_id: string };
      flag_overrides?: Record<string, unknown>;
    }>();
    if (config.flag_overrides) {
      this.flagOverrides = config.flag_overrides;
    }
    const ldConfig = config.launch_darkly;
    if (!ldConfig && !initializerContext.env.mode.dev) {
      // If the plugin is enabled, and it's in prod mode, launch_darkly must exist
      // (config-schema should enforce it, but just in case).
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    }
    if (ldConfig) {
      this.clientId = ldConfig.client_id;
    }
  }

  /**
   * Sets up the A/B testing client only if cloud is enabled
   * @param core {@link CoreSetup}
   * @param deps {@link CloudExperimentsPluginSetupDeps}
   */
  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    if (deps.cloud.isCloudEnabled && deps.cloud.cloudId && this.clientId) {
      import('launchdarkly-js-client-sdk').then(
        (LaunchDarkly) => {
          this.launchDarklyClient = LaunchDarkly.initialize(
            this.clientId!,
            {
              // We use the Hashed Cloud Deployment ID as the userId in the Cloud Experiments
              key: sha256(deps.cloud.cloudId!),
              custom: {
                kibanaVersion: this.kibanaVersion,
              },
            },
            { application: { id: 'kibana-browser', version: this.kibanaVersion } }
          );
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.debug(`Error setting up LaunchDarkly: ${err.toString()}`);
        }
      );
    }
  }

  /**
   * Returns the contract {@link CloudExperimentsPluginStart}
   * @param core {@link CoreStart}
   */
  public start(core: CoreStart): CloudExperimentsPluginStart {
    return {
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
  }

  /**
   * Cleans up and flush the sending queues.
   */
  public stop() {
    this.launchDarklyClient
      ?.flush()
      // eslint-disable-next-line no-console
      .catch((err) => console.warn(err));
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
    if (!this.launchDarklyClient) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient.waitForInitialization();
    return this.launchDarklyClient.variation(configKey, defaultValue);
  };

  private reportMetric = <Data>({ name, meta, value }: CloudExperimentsMetric<Data>): void => {
    const metricName = METRIC_NAMES[name];
    this.launchDarklyClient?.track(metricName, meta, value);
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.debug(`Reported experimentation metric ${metricName}`, {
        experimentationMetric: { name, meta, value },
      });
    }
  };
}

function sha256(str: string) {
  return new Sha256().update(str, 'utf8').digest('hex');
}
