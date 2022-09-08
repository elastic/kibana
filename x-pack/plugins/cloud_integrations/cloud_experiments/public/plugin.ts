/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import LaunchDarkly, { type LDClient } from 'launchdarkly-js-client-sdk';
import { get } from 'lodash';
import {
  FEATURE_FLAG_NAMES,
  METRIC_NAMES,
  type CloudExperimentsFeatureFlagNames,
  type CloudExperimentsMetric,
  type CloudExperimentsPluginSetup,
  type CloudExperimentsPluginStart,
} from '../common';

/**
 * Browser-side implementation of the Cloud Experiments plugin
 */
export class CloudExperimentsPlugin
  implements Plugin<CloudExperimentsPluginSetup, CloudExperimentsPluginStart>
{
  private launchDarklyClient?: LDClient;
  private readonly clientId?: string;
  private readonly kibanaVersion: string;
  private readonly flagOverrides?: Record<string, unknown>;

  /** Constructor of the plugin **/
  constructor(core: PluginInitializerContext) {
    this.kibanaVersion = core.env.packageInfo.version;
    const config = core.config.get<{
      launch_darkly?: { client_id: string };
      flag_overrides?: Record<string, unknown>;
    }>();
    if (config.flag_overrides) {
      this.flagOverrides = config.flag_overrides;
    } else {
      const ldConfig = config.launch_darkly; // If the plugin is enabled and no flag_overrides are provided (dev mode only), launch_darkly must exist
      if (!ldConfig) {
        throw new Error(
          'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
        );
      }
      if (ldConfig) {
        this.clientId = ldConfig.client_id;
      }
    }
  }

  /**
   * Returns the contract {@link CloudExperimentsPluginSetup}
   * @param core {@link CoreSetup}
   */
  public setup(core: CoreSetup): CloudExperimentsPluginSetup {
    return {
      identifyUser: (userId, userMetadata) => {
        if (!this.clientId) return;

        if (!this.launchDarklyClient) {
          // If the client has not been initialized, create it with the user data..
          this.launchDarklyClient = LaunchDarkly.initialize(
            this.clientId,
            { key: userId, custom: userMetadata },
            { application: { id: 'kibana-browser', version: this.kibanaVersion } }
          );
        } else {
          // Otherwise, call the `identify` method.
          this.launchDarklyClient
            .identify({ key: userId, custom: userMetadata })
            // eslint-disable-next-line no-console
            .catch((err) => console.warn(err));
        }
      },
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
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
    this.launchDarklyClient?.flush();
  }

  private getVariation = async <Data>(
    featureFlagName: CloudExperimentsFeatureFlagNames,
    defaultValue: Data
  ): Promise<Data> => {
    const configKey = FEATURE_FLAG_NAMES[featureFlagName];
    if (this.flagOverrides) {
      // Only to help dev testing. This setting will fail if provided when in production.
      return get(this.flagOverrides, configKey, defaultValue) as Data;
    }
    if (!this.launchDarklyClient) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient.waitForInitialization();
    return this.launchDarklyClient.variation(configKey, defaultValue);
  };

  private reportMetric = <Data>({ name, meta, value }: CloudExperimentsMetric<Data>): void => {
    const metricName = METRIC_NAMES[name];
    this.launchDarklyClient?.track(metricName, meta, value);
    // eslint-disable-next-line no-console
    console.debug(`Reported experimentation metric ${metricName}`, {
      experimentationMetric: { name, meta, value },
    });
  };
}
