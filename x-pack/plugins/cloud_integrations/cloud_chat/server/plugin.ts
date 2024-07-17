/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { registerChatRoute } from './routes';
import type { CloudChatConfigType } from './config';
import type { ChatVariant } from '../common/types';

interface CloudChatSetupDeps {
  cloud: CloudSetup;
}

export class CloudChatPlugin implements Plugin<void, void, CloudChatSetupDeps> {
  private readonly config: CloudChatConfigType;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup, { cloud }: CloudChatSetupDeps) {
    const { chatIdentitySecret, trialBuffer } = this.config;
    const { isCloudEnabled, trialEndDate } = cloud;

    if (isCloudEnabled && chatIdentitySecret) {
      registerChatRoute({
        router: core.http.createRouter(),
        chatIdentitySecret,
        trialEndDate,
        trialBuffer,
        isDev: this.isDev,
        getChatVariant: () =>
          core
            .getStartServices()
            .then(([{ featureFlags }]) =>
              featureFlags.getStringValue<ChatVariant>('cloud-chat.chat-variant', 'header')
            ),
        getChatDisabledThroughExperiments: () =>
          core
            .getStartServices()
            .then(([{ featureFlags }]) => featureFlags.getBooleanValue('cloud-chat.enabled', true)),
      });
    }
  }

  public start() {}

  public stop() {}
}
