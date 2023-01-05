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

interface SetupGainsightDeps {
  analytics: AnalyticsServiceSetup;
  basePath: IBasePath;
}

interface CloudGainsightConfig {
  org_id?: string;
}

interface CloudGainsightSetupDeps {
  cloud: CloudSetup;
}

export class CloudGainsightPlugin implements Plugin {
  private readonly config: CloudGainsightConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudGainsightConfig>();
  }

  public setup(core: CoreSetup, { cloud }: CloudGainsightSetupDeps) {
    if (cloud.isCloudEnabled) {
      this.setupGainsight({ analytics: core.analytics, basePath: core.http.basePath }).catch((e) =>
        // eslint-disable-next-line no-console
        console.debug(`Error setting up Gainsight: ${e.toString()}`)
      );
    }
  }

  public start() {}

  public stop() {}

  /**
   * If the right config is provided, register the Gainsight shipper to the analytics client.
   * @param analytics Core's Analytics service's setup contract.
   * @param basePath Core's http.basePath helper.
   * @private
   */
  private async setupGainsight({ analytics, basePath }: SetupGainsightDeps) {
    const { org_id: gainsightOrgId } = this.config;
    if (!gainsightOrgId) {
      return; // do not load any Gainsight code in the browser if not enabled
    }

    // Keep this import async so that we do not load any Gainsight code into the browser when it is disabled.
    const { GainsightShipper } = await import('@kbn/analytics-shippers-gainsight');
    analytics.registerShipper(GainsightShipper, {
      gainsightOrgId,
      // Load an Elastic-internally audited script. Ideally, it should be hosted on a CDN.
      scriptUrl: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/gainsight.js`
      ),
      cssFileEndpoint: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/gainsight.css`
      ),
      widgetFileEndpoint: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/gainsight_widget.js`
      ),
    });
  }
}
