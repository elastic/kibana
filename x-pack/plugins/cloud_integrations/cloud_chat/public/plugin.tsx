/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { SecurityPluginSetup } from '@kbn/security-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { ReplaySubject } from 'rxjs';
import type { GetChatUserDataResponseBody } from '../common/types';
import { GET_CHAT_USER_DATA_ROUTE_PATH } from '../common/constants';
import { ChatConfig, ServicesProvider } from './services';

interface CloudChatSetupDeps {
  cloud: CloudSetup;
  security?: SecurityPluginSetup;
}

interface SetupChatDeps extends CloudChatSetupDeps {
  http: HttpSetup;
}

interface CloudChatConfig {
  chatURL?: string;
}

export class CloudChatPlugin implements Plugin {
  private readonly config: CloudChatConfig;
  private chatConfig$ = new ReplaySubject<ChatConfig>(1);

  constructor(initializerContext: PluginInitializerContext<CloudChatConfig>) {
    this.config = initializerContext.config.get();
  }

  public setup(core: CoreSetup, { cloud, security }: CloudChatSetupDeps) {
    this.setupChat({ http: core.http, cloud, security }).catch((e) =>
      // eslint-disable-next-line no-console
      console.debug(`Error setting up Chat: ${e.toString()}`)
    );

    const CloudChatContextProvider: FC = ({ children }) => {
      // There's a risk that the request for chat config will take too much time to complete, and the provider
      // will maintain a stale value.  To avoid this, we'll use an Observable.
      const chatConfig = useObservable(this.chatConfig$, undefined);
      return <ServicesProvider chat={chatConfig}>{children}</ServicesProvider>;
    };
    cloud.registerCloudService(CloudChatContextProvider);
  }

  public start() {}

  public stop() {}

  private async setupChat({ cloud, http, security }: SetupChatDeps) {
    if (!cloud.isCloudEnabled || !security || !this.config.chatURL) {
      return;
    }

    try {
      const {
        email,
        id,
        token: jwt,
      } = await http.get<GetChatUserDataResponseBody>(GET_CHAT_USER_DATA_ROUTE_PATH);

      if (!email || !id || !jwt) {
        return;
      }

      this.chatConfig$.next({
        chatURL: this.config.chatURL,
        user: {
          email,
          id,
          jwt,
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug(
        `[cloud.chat] Could not retrieve chat config: ${e.response.status} ${e.message}`,
        e
      );
    }
  }
}
