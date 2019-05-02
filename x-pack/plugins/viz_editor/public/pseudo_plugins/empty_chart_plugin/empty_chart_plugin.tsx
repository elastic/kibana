/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import {
  EditorPlugin,
  getOperatorsForField,
  Suggestion,
  VisModel,
  VisualizationPanelProps,
} from '../..';
import { DatasourceField, fieldToOperation } from '../../../common';
import { getTopSuggestion } from '../../common';
import { Draggable } from '../../common/components/draggable';
import { DroppablePane } from '../../frame/main/droppable_pane';

const PLUGIN_NAME = 'empty_chart';

// tslint:disable-next-line:no-empty-interface
interface EmptyChartPrivateState {}

type EmptyChartVisModel = VisModel<'emptyChart', EmptyChartPrivateState>;

function configPanel({
  visModel,
  onChangeVisModel,
  getSuggestions,
}: VisualizationPanelProps<EmptyChartVisModel>) {
  const onDropField = (field: DatasourceField) => {
    const firstQuery = Object.values(visModel.queries)[0];
    const firstQueryKey = Object.keys(visModel.queries)[0];
    const possibleOperator = field.type === 'number' ? 'avg' : getOperatorsForField(field)[0];
    const possibleOperation = fieldToOperation(field, possibleOperator);
    const extendedQueryState = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          select: [possibleOperation],
        },
      },
    };
    const suggestion = getTopSuggestion(getSuggestions(extendedQueryState));

    onChangeVisModel({
      ...prefillPrivateState(suggestion.visModel),
      editorPlugin: suggestion.pluginName,
    });
  };

  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Add dimension</span>
        <Draggable canHandleDrop={(f: DatasourceField) => true} onDrop={onDropField}>
          Drop a field here
        </Draggable>
      </div>
    </>
  );
}

function WorkspacePanel(props: VisualizationPanelProps<EmptyChartVisModel>) {
  return (
    <DroppablePane {...props} useFirstSuggestion>
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
        Drop a field here to start visualizing</EuiFlexItem>
      </EuiFlexGroup>
    </DroppablePane>
  );
}

function toExpression(viewState: EmptyChartVisModel, mode: 'preview' | 'view' | 'edit' = 'view') {
  return ``;
}

function buildSuggestion(visModel: EmptyChartVisModel, score: number = 0.5) {
  const title = 'Empty chart';

  return {
    title,
    visModel,
    previewExpression: toExpression(visModel, 'preview'),
    score,
    iconType: 'visMetric',
    pluginName: PLUGIN_NAME,
    category: 'Empty',
  } as Suggestion;
}

function getChartSuggestions(visModel: EmptyChartVisModel): Suggestion[] {
  const firstQuery = Object.values(visModel.queries)[0];

  if (!firstQuery || firstQuery.select.length !== 0) {
    return [];
  }

  const prefilledState = prefillPrivateState(visModel);

  return [buildSuggestion(prefilledState, 0.8)];
}

function prefillPrivateState(visModel: VisModel) {
  return {
    ...visModel,
    editorPlugin: 'empty_chart',
    private: { ...visModel.private, emptyChart: {} },
  } as EmptyChartVisModel;
}

export const config: EditorPlugin<EmptyChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: configPanel,
  WorkspacePanel,
  getChartSuggestions,
  getSuggestionsForField: () => [],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
