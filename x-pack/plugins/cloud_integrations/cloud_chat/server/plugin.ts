/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { ChatVariant } from '../common/types';
import type { CloudChatConfigType } from './config';
import { registerChatRoute } from './routes';

interface CloudChatSetupDeps {
  cloud: CloudSetup;
  security?: SecurityPluginSetup;
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

  public setup(core: CoreSetup<CloudChatStartDeps>, { cloud, security }: CloudChatSetupDeps) {
    const { chatIdentitySecret, trialBuffer } = this.config;
    const { isCloudEnabled, trialEndDate } = cloud;

    if (isCloudEnabled && chatIdentitySecret) {
      registerChatRoute({
        router: core.http.createRouter(),
        chatIdentitySecret,
        trialEndDate,
        trialBuffer,
        security,
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
