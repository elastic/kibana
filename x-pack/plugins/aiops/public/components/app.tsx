/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';

import { streamFetch } from './stream_fetch';
import {
  initialState,
  cancelStream,
  resetStream,
  setIsRunning,
  streamReducer,
} from './stream_reducer';

interface AiopsAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

const imageUrls = {
  'The whole army': 'https://i.pinimg.com/originals/d0/d7/8c/d0d78cb1281c2c2cd7705324debdf621.gif',
  Aragorn:
    'https://img.wattpad.com/6df513d8d6a58db43669784e195ce7563099ddc1/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f766235666d474e4c6c6962452d773d3d2d3638363235323432372e313537656331333361343464623164373732363937343435333239372e676966',
  Eowyn:
    'https://img.wattpad.com/dc8cc703540ee83f238e7516d542320dcb57a025/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f335a69435758336f4d7a772d34513d3d2d3239383432363537352e313436616530303235393661353238323232373938313737333337352e676966',
  Frodo: 'https://qph.fs.quoracdn.net/main-qimg-8d65585bb9a4badab1a02e16cfadc466',
  Galadriel:
    'https://64.media.tumblr.com/4f9fde5cc4b34cbbd9d8977790395b80/tumblr_pac1qyUO4M1wc15f6o1_540.gifv',
};

export const AiopsApp = ({ basename, notifications, http, navigation }: AiopsAppDeps) => {
  // Use React hooks to manage state.
  const [state, dispatch] = useReducer(streamReducer, initialState);

  const abortCtrl = useRef(new AbortController());

  const onClickHandler = async () => {
    abortCtrl.current.abort();

    if (state.isRunning) {
      dispatch(cancelStream());
      return;
    }

    dispatch(resetStream());
    dispatch(setIsRunning(true));

    abortCtrl.current = new AbortController();
    await streamFetch(dispatch, abortCtrl);

    dispatch(setIsRunning(false));
    console.log('Response fully received');
  };

  console.log('state', state);

  const entities =
    !state.isRunning && state.progress === 100
      ? { 'The whole army': Object.values(state.entities).reduce((p, c) => p + c, 0) }
      : state.entities;

  const cardNodes = Object.entries(entities).map(function ([entity, value], index) {
    return (
      <EuiFlexItem key={entity}>
        <EuiCard
          image={
            <div>
              <img src={imageUrls[entity]} alt="Nature" />
            </div>
          }
          title={entity}
          description={`${entity} killed ${value} orcs.`}
          onClick={() => {}}
        />
      </EuiFlexItem>
    );
  });

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={false}
            useDefaultBehaviors={false}
          />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="aiops.helloWorldText"
                      defaultMessage="{name}"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiPageContentHeader>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="aiops.congratulationsTitle"
                        defaultMessage="Single endpoint streaming demo"
                      />
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiPageContentBody>
                  <EuiText>
                    <EuiFlexGroup alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiButton type="primary" size="s" onClick={onClickHandler}>
                          {!state.isRunning && (
                            <FormattedMessage
                              id="aiops.buttonText"
                              defaultMessage="Commence fighting!"
                            />
                          )}
                          {state.isRunning && (
                            <FormattedMessage
                              id="aiops.buttonText"
                              defaultMessage="Flee from the battle!"
                            />
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <p>{state.progress}</p>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiProgress value={state.progress} max={100} size="xs" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer />
                    <EuiFlexGroup gutterSize="l">{cardNodes}</EuiFlexGroup>
                  </EuiText>
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};
