/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import ReactDOM from 'react-dom';
import useObservable from 'react-use/lib/useObservable';
import { ReplaySubject, first } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { ChatVariant, GetChatUserDataResponseBody } from '../common/types';
import { GET_CHAT_USER_DATA_ROUTE_PATH } from '../common/constants';
import { ChatConfig, ServicesProvider } from './services';
import { isTodayInDateWindow } from '../common/util';
import { ChatExperimentSwitcher } from './components/chat_experiment_switcher';

interface CloudChatSetupDeps {
  cloud: CloudSetup;
}

interface CloudChatStartDeps {
  cloud: CloudStart;
}

interface SetupChatDeps extends CloudChatSetupDeps {
  http: HttpSetup;
}

interface CloudChatConfig {
  chatURL?: string;
  trialBuffer: number;
}

export class CloudChatPlugin implements Plugin<void, void, CloudChatSetupDeps, CloudChatStartDeps> {
  private readonly config: CloudChatConfig;
  private readonly logger: Logger;
  private chatConfig$ = new ReplaySubject<ChatConfig>(1);
  private kbnVersion: string;
  private kbnBuildNum: number;

  constructor(initializerContext: PluginInitializerContext<CloudChatConfig>) {
    this.kbnVersion = initializerContext.env.packageInfo.version;
    this.kbnBuildNum = initializerContext.env.packageInfo.buildNum;
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { cloud }: CloudChatSetupDeps) {
    this.setupChat({ http: core.http, cloud }).catch((e) =>
      this.logger.debug(`Error setting up Chat: ${e.toString()}`)
    );
  }

  public start(core: CoreStart) {
    const CloudChatContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
      // There's a risk that the request for chat config will take too much time to complete, and the provider
      // will maintain a stale value.  To avoid this, we'll use an Observable.
      const chatConfig = useObservable(this.chatConfig$, undefined);
      return <ServicesProvider chat={chatConfig}>{children}</ServicesProvider>;
    };
    function ConnectedChat(props: { chatVariant: ChatVariant }) {
      return (
        <CloudChatContextProvider>
          <KibanaRenderContextProvider {...core}>
            <ChatExperimentSwitcher
              location$={core.application.currentLocation$}
              variant={props.chatVariant}
            />
          </KibanaRenderContextProvider>
        </CloudChatContextProvider>
      );
    }

    this.chatConfig$.pipe(first((config) => config != null)).subscribe((config) => {
      core.chrome.navControls.registerExtension({
        order: 50,
        mount: (e) => {
          ReactDOM.render(<ConnectedChat chatVariant={config.chatVariant} />, e);
          return () => {
            ReactDOM.unmountComponentAtNode(e);
          };
        },
      });
    });
  }

  public stop() {}

  private async setupChat({ cloud, http }: SetupChatDeps) {
    const { isCloudEnabled, trialEndDate } = cloud;
    const { chatURL, trialBuffer } = this.config;

    if (
      !isCloudEnabled ||
      !chatURL ||
      !trialEndDate ||
      !isTodayInDateWindow(trialEndDate, trialBuffer)
    ) {
      return;
    }

    try {
      const {
        email,
        id,
        token: jwt,
        chatVariant,
      } = await http.get<GetChatUserDataResponseBody>(GET_CHAT_USER_DATA_ROUTE_PATH);

      if (!email || !id || !jwt) {
        return;
      }

      this.chatConfig$.next({
        chatURL,
        chatVariant,
        user: {
          email,
          id,
          jwt,
          trialEndDate: trialEndDate!,
          kbnVersion: this.kbnVersion,
          kbnBuildNum: this.kbnBuildNum,
        },
      });
    } catch (e) {
      this.logger.debug(
        `[cloud.chat] Could not retrieve chat config: ${e.response.status} ${e.message}`,
        e
      );
    }
  }
}
