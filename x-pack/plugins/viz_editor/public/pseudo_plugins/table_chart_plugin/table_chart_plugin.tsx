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
import { AxisEditor } from './axis_editor';

const PLUGIN_NAME = 'table_chart';

// tslint:disable-next-line:no-empty-interface
interface TableChartPrivateState {}

type TableChartVisModel = VisModel<'tableChart', TableChartPrivateState>;

function configPanel({
  visModel,
  onChangeVisModel,
  getSuggestions,
}: VisualizationPanelProps<TableChartVisModel>) {
  const firstQuery = Object.values(visModel.queries)[0];
  const firstQueryKey = Object.keys(visModel.queries)[0];

  const onDropField = (pos: number) => (field: DatasourceField) => {
    const possibleOperator = field.type === 'number' ? 'avg' : getOperatorsForField(field)[0];
    const possibleOperation = fieldToOperation(
      String(Math.floor(Math.random() * 100000)),
      field,
      possibleOperator
    );
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
          <div className="configPanel-axis">
            <span className="configPanel-axis-title">Add dimension</span>
            <Draggable canHandleDrop={(f: DatasourceField) => true} onDrop={onDropField(index)}>
              Drop another field here
            </Draggable>
          </div>
          <div className="configPanel-axis">
            <span className="configPanel-axis-title">Column {index + 1}</span>
            <AxisEditor
              operationId={getColumnIdByIndex(visModel.queries, 0, index)!}
              visModel={visModel}
              onChangeVisModel={onChangeVisModel}
            />
          </div>
        </React.Fragment>
      ))}
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Add dimension</span>
        <Draggable
          canHandleDrop={(f: DatasourceField) => true}
          onDrop={onDropField(firstQuery.select.length)}
        >
          Drop another field here
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
    previewExpression: '',
    score,
    iconType: 'visMetric',
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
  return [];
}

export const config: EditorPlugin<TableChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions,
  getSuggestionsForField,
  getInitialState: currentState => prefillPrivateState(currentState),
};
