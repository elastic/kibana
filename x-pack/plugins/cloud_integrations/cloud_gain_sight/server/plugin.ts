/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

import {
  registerGainSightRoute,
  registerGainSightStyleRoute,
  registerGainSightWidgetRoute,
} from './routes';

interface CloudGainSightSetupDeps {
  cloud: CloudSetup;
}

export class CloudGainSightPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { cloud }: CloudGainSightSetupDeps) {
    if (cloud.isCloudEnabled) {
      registerGainSightRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
      registerGainSightWidgetRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
      registerGainSightStyleRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
    }
  }

  public start() {}

  public stop() {}
}
