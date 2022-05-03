/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';

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
  notifications: CoreStart['notifications'];
}

export const AiopsApp = ({ notifications }: AiopsAppDeps) => {
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
    await streamFetch(dispatch, abortCtrl, notifications);

    dispatch(setIsRunning(false));
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <I18nProvider>
      <EuiPage restrictWidth="1000px">
        <EuiPageBody>
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
                          id="aiops.startbuttonText"
                          defaultMessage="Commence fighting!"
                        />
                      )}
                      {state.isRunning && (
                        <FormattedMessage
                          id="aiops.cancelbuttonText"
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
                      description={i18n.translate('aiops.streamFetch.winCardDescription', {
                        defaultMessage: 'You defeated {defeatedOrcs} orcs.',
                        values: {
                          defeatedOrcs: Object.values(state.entities).reduce((p, c) => p + c, 0),
                        },
                      })}
                    />
                  )}
                  {state.isCancelled && <CancelCard />}
                </EuiFlexGroup>
              </EuiText>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </I18nProvider>
  );
};
