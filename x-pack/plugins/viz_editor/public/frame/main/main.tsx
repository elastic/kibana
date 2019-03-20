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
// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
// @ts-ignore
import { getInterpreter } from 'plugins/interpreter/interpreter';
// @ts-ignore
import { renderersRegistry } from 'plugins/interpreter/registries';
import React, { useEffect, useReducer, useRef } from 'react';
import { initialState, ViewModel } from '../../../common/lib';

import 'brace/ext/language_tools';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/theme/github';

import { registry } from '../../editor_plugin_registry';

type Action =
  | { type: 'loaded'; time: Date }
  | { type: 'loadError'; message: string }
  | { type: 'updateViewModel'; newState: ViewModel };

function reducer(state: ViewModel, action: Action): ViewModel {
  switch (action.type) {
    case 'updateViewModel':
      // TODO this is the place where we can hook in an undo/redo history later
      return action.newState;
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

export function Main() {
  const [state, dispatch] = useReducer(reducer, initialState());

  const { ConfigPanel, DataPanel, toExpression } = registry.getByName(state.editorPlugin);

  const onChangeViewModel = (newState: ViewModel) => {
    dispatch({ type: 'updateViewModel', newState });
  };

  const expression = toExpression(state, 'edit');

  return (
    <EuiPage>
      <EuiPageSideBar>
        <DataPanel viewModel={state} onChangeViewModel={onChangeViewModel} />
      </EuiPageSideBar>
      <EuiPageBody className="vzBody">
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={5}>
                <ExpressionRenderer expression={expression} />
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
        <ConfigPanel viewModel={state} onChangeViewModel={onChangeViewModel} />
        {/* TODO get suggestion scores from all of the plugins and display top 3 or something here */}
      </EuiPageSideBar>
    </EuiPage>
  );
}
export const runPipeline = async (expression: string, context: object, handlers: any) => {
  const ast = fromExpression(expression);
  const { interpreter } = await getInterpreter();
  const pipelineResponse = await interpreter.interpretAst(ast, context, handlers);
  return pipelineResponse;
};

async function runAndRender(expression: any, domElement: any) {
  const response = await runPipeline(expression, {}, { getInitialContext: () => ({}) });
  if (response.type === 'render') {
    renderersRegistry.get(response.as).render(domElement, response.value);
  }
}

export function ExpressionRenderer(props: any) {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);

  useEffect(() => {
    if (mountpoint.current) {
      runAndRender(props.expression, mountpoint.current);
    }
  });

  return (
    <div
      ref={el => {
        mountpoint.current = el;
      }}
    />
  );
}
