/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Dispatch, useEffect, useReducer } from 'react';

import 'brace/ext/language_tools';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/theme/github';

import { registry, StandardVisState } from '../../../editor_config_registry';

interface Props {
  kfetch: (opts: any) => Promise<any>;
}

interface State {
  loading: boolean;
  time: Date;
  errorMessage: string;
  currentEditorConfig: string;
  standardVisState: StandardVisState;
  customVisState: { [key: string]: object };
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

  useEffect(() => {
    fetchInitialState(kfetch, dispatch);
  }, []);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  const {
    editorPanels,
    toExpression,
    defaultCustomState,
    defaultStandardState,
  } = registry.getByName(state.currentEditorConfig);

  const { leftPanel, rightPanel } = editorPanels({
    standardState: state.standardVisState || defaultStandardState,
    customState: state.customVisState[state.currentEditorConfig] || defaultCustomState,
    onChangeStandardState: (newState: StandardVisState) => {
      dispatch({ type: 'updateStandardVisState', newState });
    },
    onChangeCustomState: (newState: object) => {
      dispatch({ type: 'updateCustomVisState', newState });
    },
  });

  const expression = toExpression(
    state.standardVisState || defaultStandardState,
    state.customVisState[state.currentEditorConfig] || defaultCustomState
  );

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
          <EuiPageContentBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={5}>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>{leftPanel}</EuiFlexItem>
                  <EuiFlexItem>
                    The expression will be rendered here: {expression}
                    {/* TODO execute the expression and render it to a node inside here */}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {rightPanel}
                    {/* TODO get suggestion scores from all of the plugins and display top 3 or something here */}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                {/* TODO as soon as something changes here, switch to the "expression"-editor */}
                <EuiCodeEditor
                  mode="javascript"
                  theme="github"
                  width="100%"
                  height="30px"
                  value={expression}
                  setOptions={{
                    fontSize: '14px',
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    enableLiveAutocompletion: true,
                  }}
                  aria-label="Code Editor"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
