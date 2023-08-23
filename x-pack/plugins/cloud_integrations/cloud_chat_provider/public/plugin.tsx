/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';

export interface CloudChatProviderPluginSetup {
  registerChatProvider: (getChat: () => React.ComponentType | undefined) => void;
}

export interface CloudChatProviderPluginStart {
  Chat?: React.ComponentType;
}

export class CloudChatProviderPlugin
  implements Plugin<CloudChatProviderPluginSetup, CloudChatProviderPluginStart>
{
  private getChat: (() => React.ComponentType | undefined) | undefined;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {
      registerChatProvider: (getChat: () => React.ComponentType | undefined) => {
        if (this.getChat) {
          throw new Error('Chat component has already been provided');
        }

        this.getChat = getChat;
      },
    };
  }

  public start(core: CoreStart) {
    return {
      Chat: () => {
        const Chat = this.getChat?.();
        return Chat ? <Chat /> : <></>;
      },
    };
  }

  public stop() {}
}
