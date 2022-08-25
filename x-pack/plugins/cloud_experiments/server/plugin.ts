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

import LaunchDarkly, { type LDClient, type LDUser } from 'launchdarkly-node-server-sdk';
import type { LogMeta } from '@kbn/logging';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerUsageCollector } from './usage';
import type {
  CloudExperimentsMetric,
  CloudExperimentsPluginSetup,
  CloudExperimentsPluginStart,
} from '../common';
import type { CloudExperimentsConfigType } from './config';

interface CloudExperimentsPluginSetupDeps {
  usageCollection?: UsageCollectionSetup;
}

export class CloudExperimentsPlugin
  implements
    Plugin<
      CloudExperimentsPluginSetup,
      CloudExperimentsPluginStart,
      CloudExperimentsPluginSetupDeps
    >
{
  private readonly logger: Logger;
  private readonly launchDarklyClient: LDClient;
  private launchDarklyUser: LDUser | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<CloudExperimentsConfigType>();
    this.launchDarklyClient = LaunchDarkly.init(config.sdkKey!, {
      application: { id: `kibana-server`, version: initializerContext.env.packageInfo.version },
      logger: LaunchDarkly.basicLogger({ level: config.clientLogLevel }),
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

  public setup(
    core: CoreSetup,
    deps: CloudExperimentsPluginSetupDeps
  ): CloudExperimentsPluginSetup {
    this.logger.debug('cloudExperiments: Setup');

    if (deps.usageCollection) {
      registerUsageCollector(deps.usageCollection, () => ({
        launchDarklyClient: this.launchDarklyClient,
        launchDarklyUser: this.launchDarklyUser,
      }));
    }

    return {
      identifyUser: (userId, userMetadata) => {
        this.launchDarklyUser = { key: userId, custom: userMetadata };
        this.launchDarklyClient.identify(this.launchDarklyUser!);
      },
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
  }

  public start(core: CoreStart) {
    this.logger.debug('cloudExperiments: Started');
    return {
      getVariation: this.getVariation,
      reportMetric: this.reportMetric,
    };
  }

  public stop() {
    this.launchDarklyClient.flush().catch((err) => this.logger.error(err));
  }

  private getVariation = async <Data>(configKey: string, defaultValue: Data): Promise<Data> => {
    if (!this.launchDarklyUser) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient.waitForInitialization();
    return await this.launchDarklyClient.variation(configKey, this.launchDarklyUser, defaultValue);
  };

  private reportMetric = <Data>({
    metricName,
    metricData,
    metricValue,
  }: CloudExperimentsMetric<Data>): void => {
    if (!this.launchDarklyUser) return; // Skip any action if no LD User is defined
    this.launchDarklyClient.track(metricName, this.launchDarklyUser, metricData, metricValue);
    this.logger.debug<{ experimentationMetric: CloudExperimentsMetric<Data> } & LogMeta>(
      `Reported experimentation metric ${metricName}`,
      {
        experimentationMetric: { metricName, metricData, metricValue },
      }
    );
  };
}
