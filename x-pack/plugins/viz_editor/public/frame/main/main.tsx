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
  EuiPageSideBar,
} from '@elastic/eui';
import React, { useReducer } from 'react';
import { initialState, ViewModel } from '../../../common/lib';
import { ExpressionRenderer } from '../expression_renderer';

import 'brace/ext/language_tools';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/theme/github';

import { registry } from '../../editor_plugin_registry';

type Action =
  | { type: 'loaded'; time: Date }
  | { type: 'loadError'; message: string }
  | { type: 'updateViewModel'; newState: ViewModel };

export interface MainProps {
  getInterpreter: () => Promise<{ interpreter: any }>;
  renderersRegistry: any;
}

function reducer(state: ViewModel, action: Action): ViewModel {
  switch (action.type) {
    case 'updateViewModel':
      // TODO this is the place where we can hook in an undo/redo history later
      return action.newState;
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

export function Main(props: MainProps) {
  const [state, dispatch] = useReducer(reducer, initialState());

  const { ConfigPanel, DataPanel, WorkspacePanel, toExpression } = registry.getByName(
    state.editorPlugin
  );

  const onChangeViewModel = (newState: ViewModel) => {
    dispatch({ type: 'updateViewModel', newState });
  };

  const panelProps = {
    viewModel: state,
    onChangeViewModel,
  };

  const expression = toExpression(state, 'edit');

  return (
    <EuiPage>
      <EuiPageSideBar>
        <DataPanel {...panelProps} />
      </EuiPageSideBar>
      <EuiPageBody className="vzBody">
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={5}>
                {WorkspacePanel ? (
                  <WorkspacePanel {...panelProps}>
                    <ExpressionRenderer {...props} expression={expression} />
                  </WorkspacePanel>
                ) : (
                  <ExpressionRenderer {...props} expression={expression} />
                )}
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
      <EuiPageSideBar>
        <ConfigPanel {...panelProps} />
        {/* TODO get suggestion scores from all of the plugins and display top 3 or something here */}
      </EuiPageSideBar>
    </EuiPage>
  );
}
