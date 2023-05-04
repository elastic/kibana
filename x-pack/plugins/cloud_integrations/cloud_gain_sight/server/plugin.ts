/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

import {
  registerGainsightRoute,
  registerGainsightStyleRoute,
  registerGainsightWidgetRoute,
} from './routes';

interface CloudGainsightSetupDeps {
  cloud: CloudSetup;
}

export class CloudGainsightPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { cloud }: CloudGainsightSetupDeps) {
    if (cloud.isCloudEnabled) {
      registerGainsightRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
      registerGainsightWidgetRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
      registerGainsightStyleRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
    }
  }

  public start() {}

  public stop() {}
}
