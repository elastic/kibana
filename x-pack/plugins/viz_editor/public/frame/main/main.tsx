/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonToggle,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  // @ts-ignore
  EuiListGroupItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageSideBar,
} from '@elastic/eui';
import React, { useReducer } from 'react';
import { initialState, VisModel } from '../../common/lib';
import { ExpressionRenderer } from '../expression_renderer';

import { registry as datasourceRegistry } from '../../datasource_plugin_registry';
import { GetSuggestionsType, registry as editorRegistry } from '../../editor_plugin_registry';
import { DroppablePane } from './droppable_pane';

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

  const getAllSuggestionsForField: GetSuggestionsType<VisModel> = (
    datasourceName,
    field,
    visModel
  ) => {
    return editorRegistry
      .getAll()
      .flatMap(plugin =>
        plugin.getSuggestionsForField
          ? plugin.getSuggestionsForField(datasourceName, field, visModel)
          : []
      );
  };

  const panelProps = {
    visModel: state.visModel,
    onChangeVisModel,
    getSuggestionsForField: getAllSuggestionsForField,
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
    .flatMap(plugin =>
      plugin.getChartSuggestions ? plugin.getChartSuggestions(state.visModel) : []
    );

  return (
    <EuiPage>
      <EuiPageSideBar>
        {datasourceRegistry.getAll().map(({ name, icon }) => (
          <EuiButtonToggle
            key={name}
            label={name}
            iconType={icon as any}
            onChange={() => {
              onChangeVisModel({
                ...state.visModel,
                datasourcePlugin: name,
                datasource: null,
                queries: {},
              });
            }}
            isSelected={name === state.visModel.datasourcePlugin}
            isEmpty
            isIconOnly
          />
        ))}
        <DataPanel {...panelProps} />
      </EuiPageSideBar>
      <EuiPageBody className="vzBody">
        <DroppablePane
          visModel={state.visModel}
          getAllSuggestionsForField={getAllSuggestionsForField}
          onChangeVisModel={onChangeVisModel}
        >
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
                <EuiCodeBlock>{expression}</EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentBody>
        </DroppablePane>
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
