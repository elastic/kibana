/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';

import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { registerChatRoute } from './routes';
import { CloudChatConfigType } from './config';

interface CloudChatSetupDeps {
  cloud: CloudSetup;
  security?: SecurityPluginSetup;
}

export class CloudChatPlugin implements Plugin<void, void, CloudChatSetupDeps> {
  private readonly config: CloudChatConfigType;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup, { cloud, security }: CloudChatSetupDeps) {
    if (cloud.isCloudEnabled && this.config.chatIdentitySecret) {
      registerChatRoute({
        router: core.http.createRouter(),
        chatIdentitySecret: this.config.chatIdentitySecret,
        security,
        isDev: this.isDev,
      });
    }
  }

  public start() {}

  public stop() {}
}
