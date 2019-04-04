/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonToggle,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiListGroupItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageSideBar,
  EuiPanel,
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useReducer } from 'react';
import {
  datasourceRegistry,
  editorRegistry,
  GetSuggestionsType,
  initialState,
  Suggestion,
  VisModel,
} from '../../../public';
import { ExpressionRenderer } from '../expression_renderer';
import { DroppablePane } from './droppable_pane';

type Action =
  | { type: 'loaded' }
  | { type: 'loadError'; message: string }
  | { type: 'expressionMode' }
  | { type: 'updateVisModel'; newState: VisModel };

export interface MainProps {
  getInterpreter: () => Promise<{ interpreter: any }>;
  renderersRegistry: any;
}

export interface RootState {
  visModel: VisModel;
  // TODO stuff like dirt and valid will go in here
  metadata: {
    expressionMode: boolean;
  };
}

function getExpression(visModel: VisModel) {
  const { toExpression: toRenderExpression } = editorRegistry.getByName(visModel.editorPlugin);

  const { toExpression: toDataFetchExpression } = datasourceRegistry.getByName(
    visModel.datasourcePlugin
  );
  const renderExpression = toRenderExpression
    ? toRenderExpression(visModel, 'edit')
    : `${visModel.editorPlugin}_chart { config }`;

  const fetchExpression = toDataFetchExpression(visModel, 'full');

  return `${fetchExpression} | ${renderExpression}`;
}

function addDataFetchingToSuggestion(suggestion: Suggestion): Suggestion {
  const { visModel, previewExpression } = suggestion;
  const datasourcePlugin = datasourceRegistry.getByName(suggestion.visModel.datasourcePlugin);
  return {
    ...suggestion,
    previewExpression: `${datasourcePlugin.toExpression(
      visModel,
      'preview'
    )} | ${previewExpression}`,
  };
}

function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    case 'expressionMode':
      return {
        ...state,
        metadata: { ...state.metadata, expressionMode: true },
        visModel: {
          ...state.visModel,
          private: {
            ...state.visModel.private,
            expression: getExpression(state.visModel),
          },
        },
      };
    case 'updateVisModel':
      if (Object.keys(action.newState.queries).length > 1) {
        throw new Error('Only a single query supported at the moment');
      }
      // TODO this is the place where we can hook in an undo/redo history later
      return { ...state, visModel: action.newState };
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

export function Main(props: MainProps) {
  const [state, dispatch] = useReducer(reducer, {
    visModel: initialState(),
    metadata: { expressionMode: false },
  });

  const { ConfigPanel, WorkspacePanel } = editorRegistry.getByName(state.visModel.editorPlugin);

  const { DataPanel } = datasourceRegistry.getByName(state.visModel.datasourcePlugin);

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
      )
      .map(addDataFetchingToSuggestion);
  };

  const panelProps = {
    visModel: state.visModel,
    onChangeVisModel,
    getSuggestionsForField: getAllSuggestionsForField,
  };

  const expression = state.metadata.expressionMode
    ? state.visModel.private.expression
    : getExpression(state.visModel);

  const suggestions = editorRegistry
    .getAll()
    .flatMap(plugin =>
      plugin.getChartSuggestions ? plugin.getChartSuggestions(state.visModel) : []
    )
    .map(addDataFetchingToSuggestion);

  const hasData = Object.keys(state.visModel.queries).length > 0;

  return (
    <EuiPage>
      {!state.metadata.expressionMode && (
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
      )}
      <EuiPageBody className="vzBody">
        <DroppablePane
          {...props}
          visModel={state.visModel}
          getAllSuggestionsForField={getAllSuggestionsForField}
          onChangeVisModel={onChangeVisModel}
        >
          <EuiPageContentBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={5}>
                {hasData &&
                  (WorkspacePanel ? (
                    <WorkspacePanel {...panelProps}>
                      <ExpressionRenderer {...props} expression={expression} />
                    </WorkspacePanel>
                  ) : (
                    <ExpressionRenderer {...props} expression={expression} />
                  ))}
              </EuiFlexItem>
              {state.metadata.expressionMode ? (
                <EuiFlexItem>
                  <EuiTextArea
                    fullWidth
                    value={expression}
                    onChange={e => {
                      onChangeVisModel({
                        ...state.visModel,
                        private: { ...state.visModel.private, expression: e.target.value },
                      });
                    }}
                  />
                </EuiFlexItem>
              ) : (
                <>
                  <EuiFlexItem>
                    <EuiCodeBlock>{expression}</EuiCodeBlock>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup direction="row" alignItems="flexStart">
                      <EuiButtonEmpty
                        size="xs"
                        onClick={() => dispatch({ type: 'expressionMode' })}
                      >
                        <FormattedMessage
                          id="xpack.viz_editor.frame.editExpressionButtonLabel"
                          defaultMessage="Edit expression directly"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiPageContentBody>
        </DroppablePane>
      </EuiPageBody>
      {!state.metadata.expressionMode && (
        <EuiPageSideBar>
          <ConfigPanel {...panelProps} />

          {hasData && (
            <>
              <h4>Suggestions</h4>
              {suggestions.map((suggestion, i) => (
                <EuiPanel
                  key={i}
                  onClick={() => {
                    onChangeVisModel({
                      ...suggestion.visModel,
                      editorPlugin: suggestion.pluginName,
                    });
                  }}
                  paddingSize="s"
                >
                  {suggestion.title}
                  <ExpressionRenderer
                    {...props}
                    expression={suggestion.previewExpression}
                    size="preview"
                  />
                </EuiPanel>
              ))}
            </>
          )}
        </EuiPageSideBar>
      )}
    </EuiPage>
  );
}
