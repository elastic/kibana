/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Dispatch, useEffect, useReducer } from 'react';

import { registry, StandardVisState } from '../../../editorConfigRegistry';

interface Props {
  kfetch: (opts: any) => Promise<any>;
}

interface State {
  loading: boolean;
  time: Date;
  errorMessage: string;
  currentEditorConfig: string;
  standardVisState: StandardVisState;
  customVisState: object;
}

type Action =
  | { type: 'loaded'; time: Date }
  | { type: 'loadError'; message: string }
  | { type: 'updateStandardVisState'; newState: StandardVisState }
  | { type: 'updateCustomVisState'; newState: object };

function initialState(): State {
  return {
    loading: true,
    time: new Date(),
    errorMessage: '',
    currentEditorConfig: 'sample',
    standardVisState: { title: 'Unknown Vis', columns: [], query: {} },
    customVisState: {},
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        loading: false,
        time: action.time,
      };
    case 'loadError':
      return {
        ...state,
        loading: false,
        errorMessage: action.message,
      };
    case 'updateStandardVisState':
      return {
        ...state,
        standardVisState: action.newState,
      };
    case 'updateCustomVisState':
      return {
        ...state,
        customVisState: { ...state.customVisState, [state.currentEditorConfig]: action.newState },
      };
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

function fetchInitialState(kfetch: any, dispatch: Dispatch<Action>) {
  return kfetch({
    pathname: '/api/viz_editor/example',
  })
    .then((data: any) =>
      dispatch({
        type: 'loaded',
        time: new Date(data.time),
      })
    )
    .catch(({ message }: any) =>
      dispatch({
        type: 'loadError',
        message,
      })
    );
}

export function Main({ kfetch }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState());
  const { time, loading, errorMessage } = state;

  useEffect(() => fetchInitialState(kfetch, dispatch), []);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  const { editorPanels, toExpression } = registry.getByName(state.currentEditorConfig);

  const { leftPanel, rightPanel } = editorPanels({
    standardState: state.standardVisState,
    customState: state.customVisState,
    onChangeStandardState: (newState: StandardVisState) => {
      dispatch({ type: 'updateStandardVisState', newState });
    },
    onChangeCustomState: (newState: object) => {
      dispatch({ type: 'updateCustomVisState', newState });
    },
  });

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="vizEditor.helloWorldText"
                defaultMessage="{title} Hello World!"
                values={{ title: 'New Visualization Editor' }}
              />
            </h1>
          </EuiTitle>
          {!!errorMessage ? (
            <p>
              <span className="euiTextColor euiTextColor--danger">{errorMessage}</span>
            </p>
          ) : null}
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="vizEditor.congratulationsTitle"
                  defaultMessage="Congratulations"
                />
              </h2>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            {leftPanel}
            Current Expression: {toExpression(state.standardVisState, state.customVisState)}
            {/* TODO execute the expression and render it to a node inside here */}
            {rightPanel}
            {/* TODO get suggestion scores from all of the plugins and display top 3 or something here */}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
