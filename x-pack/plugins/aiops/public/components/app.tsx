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

import { Cards, WinCard, CancelCard } from './cards';
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
                    <EuiFlexGroup gutterSize="l">
                      {state.isRunning && <Cards cards={state.entities} />}
                      {!state.isRunning && state.progress === 100 && (
                        <WinCard
                          description={`You defeated ${Object.values(state.entities).reduce(
                            (p, c) => p + c,
                            0
                          )} orcs.`}
                        />
                      )}
                      {state.isCancelled && <CancelCard />}
                    </EuiFlexGroup>
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
