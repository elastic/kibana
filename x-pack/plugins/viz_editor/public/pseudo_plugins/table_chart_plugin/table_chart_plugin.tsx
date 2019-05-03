/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EditorPlugin,
  getColumnIdByIndex,
  getOperatorsForField,
  Suggestion,
  VisModel,
  VisualizationPanelProps,
} from '../..';
import { DatasourceField, fieldToOperation } from '../../../common';
import { Draggable } from '../../common/components/draggable';
import { DroppablePane } from '../../frame/main/droppable_pane';
import { AxisEditor } from './axis_editor';
import { EuiTextColor } from '@elastic/eui';

const PLUGIN_NAME = 'table_chart';

// tslint:disable-next-line:no-empty-interface
interface TableChartPrivateState {}

type TableChartVisModel = VisModel<'tableChart', TableChartPrivateState>;

function lnsConfigPanel({
  visModel,
  onChangeVisModel,
  getSuggestions,
}: VisualizationPanelProps<TableChartVisModel>) {
  const firstQuery = Object.values(visModel.queries)[0];
  const firstQueryKey = Object.keys(visModel.queries)[0];

  const onDropField = (pos: number) => (field: DatasourceField) => {
    const possibleOperator = field.type === 'number' ? 'avg' : getOperatorsForField(field)[0];
    const possibleOperation = fieldToOperation(field, possibleOperator);
    const updatedSelect = [...firstQuery.select];
    updatedSelect.splice(pos, 0, possibleOperation);
    onChangeVisModel({
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          select: updatedSelect,
        },
      },
    });
  };

  return (
    <>
      {firstQuery.select.map((operation, index) => (
        <React.Fragment key={index}>
          <div className="lnsConfigPanel__axis">
            <span className="lnsConfigPanel__axisTitle">Add column</span>
            <Draggable className="lnsEmptyChart__item" canHandleDrop={(f: DatasourceField) => true} onDrop={onDropField(index)}>
              <EuiTextColor color="subdued">
                Drop another field here
              </EuiTextColor>
            </Draggable>
          </div>
          <div className="lnsConfigPanel__axis">
            <span className="lnsConfigPanel__axisTitle">Column {index + 1}</span>
            <AxisEditor
              operationId={getColumnIdByIndex(visModel.queries, 0, index)!}
              visModel={visModel}
              onChangeVisModel={onChangeVisModel}
            />
          </div>
        </React.Fragment>
      ))}
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">Add column</span>
        <Draggable
          className="lnsEmptyChart__item"
          canHandleDrop={(f: DatasourceField) => true}
          onDrop={onDropField(firstQuery.select.length)}
        >
          <EuiTextColor color="subdued">
            Drop another field here
          </EuiTextColor>
        </Draggable>
      </div>
    </>
  );
}

function toExpression(viewState: TableChartVisModel, mode: 'preview' | 'view' | 'edit' = 'view') {
  return `display_kibana_datatable`;
}

function buildSuggestion(visModel: TableChartVisModel, score: number = 0.5) {
  const title = 'As data table';

  return {
    title,
    visModel,
    previewExpression: 'icon',
    score,
    iconType: 'visTable',
    pluginName: PLUGIN_NAME,
    category: 'Metric',
  } as Suggestion;
}

function getChartSuggestions(visModel: TableChartVisModel): Suggestion[] {
  const firstQuery = Object.values(visModel.queries)[0];

  if (!firstQuery || firstQuery.select.length === 0 || firstQuery.select.length < 2) {
    return [];
  }

  const prefilledState = prefillPrivateState(visModel);

  return [buildSuggestion(prefilledState, 0.6)];
}

function prefillPrivateState(visModel: VisModel) {
  return {
    ...visModel,
    editorPlugin: 'table_chart',
    private: { ...visModel.private, tableChart: {} },
  } as TableChartVisModel;
}

function getSuggestionsForField(
  datasourceName: string,
  field: DatasourceField,
  visModel: TableChartVisModel
): Suggestion[] {
  if (visModel.editorPlugin === PLUGIN_NAME) {
    const firstQueryKey = Object.keys(visModel.queries)[0];
    const firstQuery = visModel.queries[firstQueryKey];
    const possibleOperator = field.type === 'number' ? 'sum' : getOperatorsForField(field)[0];
    const possibleOperation = fieldToOperation(field, possibleOperator);
    const updatedVisModel = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: { ...firstQuery, select: [possibleOperation, ...firstQuery.select] },
      },
    };
    const prefilledState = prefillPrivateState(updatedVisModel);

    return [buildSuggestion(prefilledState, 0.95)];
  } else {
    return [];
  }
}

function WorkspacePanel({ children, ...props }: any) {
  return (
    <DroppablePane {...props} useFirstSuggestion>
      {children}
    </DroppablePane>
  );
}

export const config: EditorPlugin<TableChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: lnsConfigPanel,
  getChartSuggestions,
  getSuggestionsForField,
  WorkspacePanel,
  getInitialState: currentState => prefillPrivateState(currentState),
};
