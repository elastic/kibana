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

interface SetupGainSightDeps {
  analytics: AnalyticsServiceSetup;
  basePath: IBasePath;
}

interface CloudGainSightConfig {
  org_id?: string;
}

interface CloudGainSightSetupDeps {
  cloud: CloudSetup;
}

export class CloudGainSightPlugin implements Plugin {
  private readonly config: CloudGainSightConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudGainSightConfig>();
  }

  public setup(core: CoreSetup, { cloud }: CloudGainSightSetupDeps) {
    if (cloud.isCloudEnabled) {
      this.setupGainSight({ analytics: core.analytics, basePath: core.http.basePath }).catch((e) =>
        // eslint-disable-next-line no-console
        console.debug(`Error setting up GainSight: ${e.toString()}`)
      );
    }
  }

  public start() {}

  public stop() {}

  /**
   * If the right config is provided, register the GainSight shipper to the analytics client.
   * @param analytics Core's Analytics service's setup contract.
   * @param basePath Core's http.basePath helper.
   * @private
   */
  private async setupGainSight({ analytics, basePath }: SetupGainSightDeps) {
    const { org_id: gainSightOrgId } = this.config;
    if (!gainSightOrgId) {
      return; // do not load any GainSight code in the browser if not enabled
    }

    // Keep this import async so that we do not load any GainSight code into the browser when it is disabled.
    const { GainSightShipper } = await import('@kbn/analytics-shippers-gainsight');
    analytics.registerShipper(GainSightShipper, {
      gainSightOrgId,
      // Load an Elastic-internally audited script. Ideally, it should be hosted on a CDN.
      scriptUrl: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/gainsight.js`
      ),
      cssFileEndpoint: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/gainsight.css`
      ),
      widgetFileEndpoint: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/gainsight_widget.js`
      )
    });
  }
}
