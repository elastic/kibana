/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonGroup,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiButtonIcon,
  EuiTabbedContent,
  // @ts-ignore
  EuiListGroupItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageSideBar,
  EuiPanel,
  EuiTextArea,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useReducer, useState } from 'react';
import {
  datasourceRegistry,
  editorRegistry,
  GetSuggestionsType,
  initialState,
  Suggestion,
  VisModel,
} from '../..';
import { ExpressionRenderer } from '../expression_renderer';
import { EuiIcon } from '@elastic/eui';

type Action =
  | { type: 'loaded' }
  | { type: 'clear' }
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

function getFetchExpression(visModel: VisModel) {
  return datasourceRegistry.getByName(visModel.datasourcePlugin).toExpression(visModel, 'full');
}

function getTableExpression(visModel: VisModel) {
  return `${getFetchExpression(visModel)} | display_kibana_datatable`;
}

function getRenderExpression(visModel: VisModel) {
  const { toExpression: toRenderExpression } = editorRegistry.getByName(visModel.editorPlugin);

  const renderExpression = toRenderExpression
    ? toRenderExpression(visModel, 'edit')
    : `${visModel.editorPlugin}_chart { config }`;

  return `${getFetchExpression(visModel)} | ${renderExpression}`;
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
            expression: getRenderExpression(state.visModel),
          },
        },
      };
    case 'updateVisModel':
      if (Object.keys(action.newState.queries).length > 1) {
        throw new Error('Only a single query supported at the moment');
      }
      // TODO this is the place where we can hook in an undo/redo history later
      return { ...state, visModel: action.newState };
    case 'clear':
      return {
        visModel: initialState(),
        metadata: { expressionMode: false },
      };
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

  const getSuggestions = (visModel: VisModel) =>
    editorRegistry
      .getAll()
      .flatMap(plugin => (plugin.getChartSuggestions ? plugin.getChartSuggestions(visModel) : []))
      .map(addDataFetchingToSuggestion);

  const suggestions = getSuggestions(state.visModel);

  const panelProps = {
    ...props,
    visModel: state.visModel,
    onChangeVisModel,
    getSuggestionsForField: getAllSuggestionsForField,
    getSuggestions,
  };

  const expression = state.metadata.expressionMode
    ? state.visModel.private.expression
    : getRenderExpression(state.visModel);

  const hasData = Object.keys(state.visModel.queries).length > 0;

  const toggleButtonsIcons = datasourceRegistry.getAll().map(({ name, icon }) => ({
    key: name,
    id: name,
    label: name,
    iconType: icon as any,
  }));

  const [flyoutIsOpen, setFlyoutIsOpen] = useState(false);

  const inspectorTabs = [{
    id: 'rawData',
    name: 'Raw data',
    content: (
      <EuiFlyoutBody>
        <ExpressionRenderer
          {...props}
          expression={getTableExpression(state.visModel)}
        />
      </EuiFlyoutBody>
    )
  }, {
    id: 'expression',
    name: 'Expression',
    content: (
      <EuiCodeBlock isCopyable>{expression}</EuiCodeBlock>
    )
  }];

  let flyout;
  if (flyoutIsOpen) {
    flyout = (
      <EuiFlyout
        onClose={() => { setFlyoutIsOpen(false); }}
        aria-labelledby="lnsInspectFlyoutTitle"
      >
        <EuiFlyoutHeader className="lnsInspectFlyout__header">
          <EuiTitle size="m">
            <h2 id="lnsInspectFlyoutTitle">
              Inspector
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiTabbedContent
          className="lnsInspectFlyout__tabbedContent"
          tabs={inspectorTabs}
          initialSelectedTab={inspectorTabs[0]}
          onTabClick={(tab) => { console.log('clicked tab', tab); }}
        />
      </EuiFlyout>
    );
  }

  return (
    <>
    <EuiPage className="lnsPage">
      {!state.metadata.expressionMode && (
        <EuiPageSideBar className="lnsSidebar">
          <EuiFlexGroup className="lnsSidebar__sourceGroup lnsSidebar__header" gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs"><h2>Source: </h2></EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend="Data source"
                name="textAlign"
                className="eui-displayInlineBlock"
                options={toggleButtonsIcons}
                idSelected={state.visModel.datasourcePlugin}
                onChange={(optionId) => {
                  onChangeVisModel({
                    ...state.visModel,
                    datasourcePlugin: optionId,
                    datasource: null,
                    queries: {},
                  });
                }}
                isIconOnly
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <DataPanel {...panelProps} />
        </EuiPageSideBar>
      )}
      <EuiPageBody className="lnsPageBody">
        <EuiPageContent className="lnsPageContent">
          <EuiPageContentHeader className="lnsPageContentHeader">
            <EuiPageContentHeaderSection>
              <EuiTitle size="xs">
                <h2>New Visualization</h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiButtonIcon
                onClick={() => { setFlyoutIsOpen(true); }}
                iconType="inspect"
                color="text"
                aria-label={i18n.translate('xpack.viz_editor.frame.inspectButtonLabel', {
                    defaultMessage: "Inspect"
                })}
                title={i18n.translate('xpack.viz_editor.frame.inspectButtonLabel', {
                    defaultMessage: "Inspect"
                })}
                isDisabled={!hasData}
              />&emsp;
              <EuiButtonIcon
                iconType="editorCodeBlock"
                color="text"
                onClick={() => dispatch({ type: 'expressionMode' })}
                aria-label={i18n.translate('xpack.viz_editor.frame.editExpressionButtonLabel', {
                    defaultMessage: "Edit expression directly"
                })}
                title={i18n.translate('xpack.viz_editor.frame.editExpressionButtonLabel', {
                    defaultMessage: "Edit expression directly"
                })}
                isDisabled={state.metadata.expressionMode}
              />&emsp;
              <EuiButtonIcon
                iconType="refresh"
                color="text"
                onClick={() => dispatch({ type: 'clear' })}
                aria-label={i18n.translate('xpack.viz_editor.frame.resetButtonLabel', {
                    defaultMessage: "Reset editor"
                })}
                title={i18n.translate('xpack.viz_editor.frame.resetButtonLabel', {
                    defaultMessage: "Reset editor"
                })}
              />
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody className="lnsPageContentBody">
            {WorkspacePanel ? (
              <WorkspacePanel {...panelProps}>
                {hasData && <ExpressionRenderer {...props} expression={expression} />}
              </WorkspacePanel>
            ) : (
              hasData && <ExpressionRenderer {...props} expression={expression} />
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>

      <EuiPageSideBar className={`lnsSidebar lnsSidebar--right ${state.metadata.expressionMode && 'lnsSidebar--expression'}`}>
        {state.metadata.expressionMode ? (
          <EuiTextArea
            className="lnsSidebar__expressionTextArea"
            fullWidth
            value={expression}
            onChange={e => {
              onChangeVisModel({
                ...state.visModel,
                private: { ...state.visModel.private, expression: e.target.value },
              });
            }}
          />
        ) : (
          <>
            <div className="lnsSidebar__header">
              {/* Hook up the button to allow user to force into a particular chart type and stay there (don't switch chart types when changing data) */}
              <EuiTitle size="xs">
                <h3>{'Auto' || panelProps.visModel.editorPlugin} <EuiButtonEmpty size="xs" disabled>(change)</EuiButtonEmpty></h3>
              </EuiTitle>
            </div>

            <ConfigPanel {...panelProps} />

            {hasData && (
              <div className="lnsSidebar__suggestions">
                <EuiTitle size="xs">
                  <h3>Suggestions</h3>
                </EuiTitle>
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
                    <EuiTitle size="xxxs">
                      <h4>{suggestion.title}</h4>
                    </EuiTitle>
                    {/* Hack for now, but should actually check if the previewExpression is valid */}
                    {suggestion.previewExpression.endsWith('| icon') ? (
                      <div className="lnsSidebar__suggestionIcon">
                        <EuiIcon size="xxl" color="subdued" type={suggestion.iconType} />
                      </div>
                    ) : (
                      <ExpressionRenderer
                        {...props}
                        expression={suggestion.previewExpression}
                        size="preview"
                      />
                    )}
                  </EuiPanel>
                ))}
              </div>
            )}
          </>
        )}
      </EuiPageSideBar>
    </EuiPage>

    {flyout}
    </>
  );
}

/*

        <DroppablePane
          {...props}
          visModel={state.visModel}
          getAllSuggestionsForField={getAllSuggestionsForField}
          onChangeVisModel={onChangeVisModel}
        >
*/
