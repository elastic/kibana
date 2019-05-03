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
import {
  getTopSuggestion,
  isApplicableForCardinality,
  operationToName,
  selectOperation,
} from '../../common';
import { Draggable } from '../../common/components/draggable';
import { DroppablePane } from '../../frame/main/droppable_pane';
import { AxisEditor } from './axis_editor';
import { EuiTextColor } from '@elastic/eui';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';

const PLUGIN_NAME = 'metric_chart';

// tslint:disable-next-line:no-empty-interface
interface MetricChartPrivateState {}

type MetricChartVisModel = VisModel<'metricChart', MetricChartPrivateState>;

function lnsConfigPanel({
  visModel,
  onChangeVisModel,
  getSuggestions,
}: VisualizationPanelProps<MetricChartVisModel>) {
  const firstOperation = getColumnIdByIndex(visModel.queries, 0, 0);

  const onDropField = (field: DatasourceField) => {
    const firstQuery = Object.values(visModel.queries)[0];
    const firstQueryKey = Object.keys(visModel.queries)[0];
    const possibleOperator = field.type === 'number' ? 'sum' : getOperatorsForField(field)[0];
    const possibleOperation = fieldToOperation(field, possibleOperator);
    const isMultiOperation = isApplicableForCardinality(firstQuery.select[0].operator, 'multi');
    const extendedQueryState = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          // add columns in the right order for xy chart to pick up
          select: isMultiOperation
            ? [possibleOperation, ...firstQuery.select]
            : [...firstQuery.select, possibleOperation],
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
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">Metric</span>
        <AxisEditor
          operationId={firstOperation!}
          visModel={visModel}
          onChangeVisModel={onChangeVisModel}
        />
        {/* TODO: Actually create a setting for these */}
        <EuiSpacer size="m" />
        <EuiSwitch disabled label="Show distribution" />
        <EuiSpacer size="m" />
        <EuiSwitch disabled label="Show other" checked={true} />
      </div>
      <div className="lnsConfigPanel__axis">
        <span className="lnsConfigPanel__axisTitle">Second dimension</span>
        <Draggable className="lnsEmptyChart__item" canHandleDrop={(f: DatasourceField) => true} onDrop={onDropField}>
          <EuiTextColor color="subdued">
            Drop another field here
          </EuiTextColor>
        </Draggable>
      </div>
    </>
  );
}

function WorkspacePanel({ children, ...props }: any) {
  return (
    <DroppablePane {...props} useFirstSuggestion>
      {children}
    </DroppablePane>
  );
}

function toExpression(viewState: MetricChartVisModel, mode: 'preview' | 'view' | 'edit' = 'view') {
  // TODO prob. do this on an AST object and stringify afterwards
  // TODO actually use the stuff from the viewState
  const operation = selectOperation(getColumnIdByIndex(viewState.queries, 0, 0)!, viewState)!;
  return `
    metric_chart title='${operationToName(operation.operator)} of ${
    'argument' in operation ? operation.argument.field : 'documents'
  }'
  `;
}

function buildSuggestion(visModel: MetricChartVisModel, score: number = 0.5) {
  const title = 'Simple metric';

  return {
    title,
    visModel,
    previewExpression: toExpression(visModel, 'preview'),
    score,
    iconType: 'visMetric',
    pluginName: PLUGIN_NAME,
    category: 'Metric',
  } as Suggestion;
}

function getChartSuggestions(visModel: MetricChartVisModel): Suggestion[] {
  const firstQuery = Object.values(visModel.queries)[0];

  if (!firstQuery || firstQuery.select.length > 1 || firstQuery.select.length === 0) {
    return [];
  }

  const prefilledState = prefillPrivateState(visModel);

  return [buildSuggestion(prefilledState, 0.8)];
}

function prefillPrivateState(visModel: VisModel) {
  return {
    ...visModel,
    editorPlugin: 'metric_chart',
    private: { ...visModel.private, metricChart: {} },
  } as MetricChartVisModel;
}

function getSuggestionsForField(
  datasourceName: string,
  field: DatasourceField,
  visModel: MetricChartVisModel
): Suggestion[] {
  const possibleOperator = getOperatorsForField(field)[0];
  const possibleOperation = fieldToOperation(field, possibleOperator);
  const prefilledState = prefillPrivateState({
    ...visModel,
    queries: { q1: { select: [possibleOperation] } },
  });

  const firstQuery = Object.values(visModel.queries)[0];
  let score = 0.8;

  // decrease score if there is already an operation in the query
  if (firstQuery && firstQuery.select.length >= 1) {
    score = 0.5;
  }
  return [buildSuggestion(prefilledState, score)];
}

export const config: EditorPlugin<MetricChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: lnsConfigPanel,
  WorkspacePanel,
  getChartSuggestions,
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
