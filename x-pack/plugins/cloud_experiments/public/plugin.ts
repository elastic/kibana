/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import LaunchDarkly, { type LDClient } from 'launchdarkly-node-client-sdk';
import type {
  CloudExperimentsMetric,
  CloudExperimentsPluginSetup,
  CloudExperimentsPluginStart,
} from '../common';

/**
 * Browser-side implementation of the Cloud Experiments plugin
 */
export class CloudExperimentsPlugin
  implements Plugin<CloudExperimentsPluginSetup, CloudExperimentsPluginStart>
{
  private launchDarklyClient?: LDClient;
  private readonly clientId: string;
  private readonly kibanaVersion: string;

  /** Constructor of the plugin **/
  constructor(core: PluginInitializerContext) {
    this.kibanaVersion = core.env.packageInfo.version;
    this.clientId = core.config.get<{ clientId: string }>().clientId;
  }

  /**
   * Returns the contract {@link CloudExperimentsPluginSetup}
   * @param core {@link CoreSetup}
   */
  public setup(core: CoreSetup): CloudExperimentsPluginSetup {
    return {
      identifyUser: (userId) => {
        this.launchDarklyClient = LaunchDarkly.initialize(
          this.clientId,
          { key: userId },
          { application: { id: 'kibana-browser', version: this.kibanaVersion } }
        );
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

  private getVariation = async <Data>(configKey: string, defaultValue: Data): Promise<Data> => {
    if (!this.launchDarklyClient) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient.waitForInitialization();
    return this.launchDarklyClient.variation(configKey, defaultValue);
  };

  private reportMetric = <Data>({
    metricName,
    metricData,
    metricValue,
  }: CloudExperimentsMetric<Data>): void => {
    this.launchDarklyClient?.track(metricName, metricData, metricValue);
    // eslint-disable-next-line no-console
    console.debug(`Reported experimentation metric ${metricName}`, {
      experimentationMetric: { metricName, metricData, metricValue },
    });
  };
}
