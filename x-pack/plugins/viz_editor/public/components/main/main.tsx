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
import { initialState, ViewModel } from '../../lib';
import { IndexPatternPanel } from '../index_pattern_panel';

import 'brace/ext/language_tools';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/theme/github';

import { registry } from '../../../editor_plugin_registry';

type Action =
  | { type: 'loaded'; time: Date }
  | { type: 'loadError'; message: string }
  | { type: 'updateViewModel'; newState: ViewModel };

function reducer(state: ViewModel, action: Action): ViewModel {
  switch (action.type) {
    case 'updateViewModel':
      return action.newState;
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

export function Main() {
  const [state, dispatch] = useReducer(reducer, initialState());

  const { ConfigPanel, DataPanel, toExpression } = registry.getByName(state.visualizationType);

  const onChangeViewModel = (newState: ViewModel) => {
    dispatch({ type: 'updateViewModel', newState });
  };

  const expression = toExpression(state);

  return (
    <EuiPage>
      <EuiFlexItem grow={false}>
        <DataPanel viewModel={state} onChangeViewModel={onChangeViewModel} />
      </EuiFlexItem>
      <EuiPageBody className="vzBody">
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={5}>
                The expression will be rendered here: {expression}
                {/* TODO execute the expression and render it to a node inside here 
                  This will be something along these lines:
                    ```const response = await runInterpreter(expression, { some: 1 });
                        // response.type === 'render'
                        if (resposne.type === 'render') {
                          rendersRegistry.get(rensponse.as).render(domElement, response);
                        }```
                */}
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
      <EuiFlexItem grow={false}>
        <ConfigPanel viewModel={state} onChangeViewModel={onChangeViewModel} />
        {/* TODO get suggestion scores from all of the plugins and display top 3 or something here */}
      </EuiFlexItem>
    </EuiPage>
  );
}
