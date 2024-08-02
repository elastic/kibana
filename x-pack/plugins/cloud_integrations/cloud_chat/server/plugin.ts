/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import { registerChatRoute } from './routes';
import type { CloudChatConfigType } from './config';
import type { ChatVariant } from '../common/types';

interface CloudChatSetupDeps {
  cloud: CloudSetup;
}

interface CloudChatStartDeps {
  cloudExperiments?: CloudExperimentsPluginStart;
}

export class CloudChatPlugin implements Plugin<void, void, CloudChatSetupDeps, CloudChatStartDeps> {
  private readonly config: CloudChatConfigType;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup<CloudChatStartDeps>, { cloud }: CloudChatSetupDeps) {
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
          core.getStartServices().then(([_, { cloudExperiments }]) => {
            if (!cloudExperiments) {
              return 'header';
            } else {
              return cloudExperiments
                .getVariation<ChatVariant>('cloud-chat.chat-variant', 'header')
                .catch(() => 'header');
            }
          }),
        getChatDisabledThroughExperiments: () =>
          core.getStartServices().then(([_, { cloudExperiments }]) => {
            if (!cloudExperiments) {
              return false;
            } else {
              return cloudExperiments
                .getVariation<boolean>('cloud-chat.enabled', true)
                .then((enabled) => !enabled)
                .catch(() => false);
            }
          }),
      });
    }
  }

  public start() {}

  public stop() {}
}
