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
  EuiListGroup,
  // @ts-ignore
  EuiListGroupItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
  // @ts-ignore
  EuiSuperSelect,
} from '@elastic/eui';
import React, { useReducer } from 'react';
import { initialState, VisModel } from '../../common/lib';
import { ExpressionRenderer } from '../expression_renderer';

import 'brace/ext/language_tools';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/theme/github';

import { registry as datasourceRegistry } from '../../datasource_plugin_registry';
import { registry as editorRegistry } from '../../editor_plugin_registry';

type Action =
  | { type: 'loaded' }
  | { type: 'loadError'; message: string }
  | { type: 'updateVisModel'; newState: VisModel };

export interface MainProps {
  getInterpreter: () => Promise<{ interpreter: any }>;
  renderersRegistry: any;
}

export interface RootState {
  visModel: VisModel;
  // TODO stuff like dirt and valid will go in here
  metadata: {};
}

function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    case 'updateVisModel':
      // TODO this is the place where we can hook in an undo/redo history later
      return { ...state, visModel: action.newState };
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

export function Main(props: MainProps) {
  const [state, dispatch] = useReducer(reducer, { visModel: initialState(), metadata: {} });

  const {
    ConfigPanel,
    WorkspacePanel,
    toExpression: toRenderExpression,
  } = editorRegistry.getByName(state.visModel.editorPlugin);

  const { DataPanel, toExpression: toDataFetchExpression } = datasourceRegistry.getByName(
    state.visModel.datasourcePlugin
  );

  const onChangeVisModel = (newState: VisModel) => {
    dispatch({ type: 'updateVisModel', newState });
  };

  const panelProps = {
    visModel: state.visModel,
    onChangeVisModel,
  };

  // TODO add a meaningful default expression builder implementation here
  const renderExpression = toRenderExpression
    ? toRenderExpression(state.visModel, 'edit')
    : `${state.visModel.editorPlugin}_chart { config }`;

  const fetchExpression = toDataFetchExpression
    ? toDataFetchExpression(state.visModel, 'edit')
    : `${state.visModel.editorPlugin}_chart { config }`;

  const expression = `${fetchExpression} | ${renderExpression}`;

  const suggestions = editorRegistry
    .getAll()
    .flatMap(plugin => (plugin.getSuggestions ? plugin.getSuggestions(state.visModel) : []));

  return (
    <EuiPage>
      <EuiPageSideBar>
        Switch datasource:
        <EuiSuperSelect
          options={datasourceRegistry
            .getAll()
            .map(({ name }) => ({ value: name, inputDisplay: name }))}
          valueOfSelected={state.visModel.datasourcePlugin}
          onChange={(value: string) => {
            // TODO this should also clear the references to all of the datasources
            onChangeVisModel({ ...state.visModel, datasourcePlugin: value, datasources: null });
          }}
        />
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
        <h4>Suggestions</h4>
        <EuiListGroup>
          {suggestions.map((suggestion, i) => (
            <EuiListGroupItem
              key={i}
              label={suggestion.title}
              iconType={suggestion.iconType}
              onClick={() => {
                onChangeVisModel({
                  ...suggestion.visModel,
                  editorPlugin: suggestion.pluginName,
                });
              }}
            />
          ))}
        </EuiListGroup>
      </EuiPageSideBar>
    </EuiPage>
  );
}
