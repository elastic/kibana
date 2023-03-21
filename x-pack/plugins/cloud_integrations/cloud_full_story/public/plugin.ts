/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  IBasePath,
  PluginInitializerContext,
  CoreSetup,
  Plugin,
} from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

interface SetupFullStoryDeps {
  analytics: AnalyticsServiceSetup;
  basePath: IBasePath;
}

interface CloudFullStoryConfig {
  org_id?: string;
  eventTypesAllowlist: string[];
}

interface CloudFullStorySetupDeps {
  cloud: CloudSetup;
}

export class CloudFullStoryPlugin implements Plugin {
  private readonly config: CloudFullStoryConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudFullStoryConfig>();
  }

  public setup(core: CoreSetup, { cloud }: CloudFullStorySetupDeps) {
    if (cloud.isCloudEnabled) {
      this.setupFullStory({ analytics: core.analytics, basePath: core.http.basePath }).catch((e) =>
        // eslint-disable-next-line no-console
        console.debug(`Error setting up FullStory: ${e.toString()}`)
      );
    }
  }

  public start() {}

  public stop() {}

  /**
   * If the right config is provided, register the FullStory shipper to the analytics client.
   * @param analytics Core's Analytics service's setup contract.
   * @param basePath Core's http.basePath helper.
   * @private
   */
  private async setupFullStory({ analytics, basePath }: SetupFullStoryDeps) {
    const { org_id: fullStoryOrgId, eventTypesAllowlist } = this.config;
    if (!fullStoryOrgId) {
      return; // do not load any FullStory code in the browser if not enabled
    }

    // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
    const { FullStoryShipper } = await import('@kbn/analytics-shippers-fullstory');
    analytics.registerShipper(FullStoryShipper, {
      eventTypesAllowlist,
      fullStoryOrgId,
      // Load an Elastic-internally audited script. Ideally, it should be hosted on a CDN.
      scriptUrl: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/fullstory.js`
      ),
      namespace: 'FSKibana',
    });
  }
}
