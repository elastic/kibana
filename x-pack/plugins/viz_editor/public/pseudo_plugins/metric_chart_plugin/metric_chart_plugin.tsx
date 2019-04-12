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
import { isApplicableForCardinality, operationToName, selectOperation } from '../../common';
import { Draggable } from '../../common/components/draggable';
import { AxisEditor } from './axis_editor';

const PLUGIN_NAME = 'metric_chart';

// tslint:disable-next-line:no-empty-interface
interface MetricChartPrivateState {}

type MetricChartVisModel = VisModel<'metricChart', MetricChartPrivateState>;

function configPanel({
  visModel,
  onChangeVisModel,
  getSuggestions,
}: VisualizationPanelProps<MetricChartVisModel>) {
  const firstOperation = getColumnIdByIndex(visModel.queries, 0, 0);

  const onDropField = (field: DatasourceField) => {
    const firstQuery = Object.values(visModel.queries)[0];
    const firstQueryKey = Object.keys(visModel.queries)[0];
    const possibleOperator = field.type === 'number' ? 'avg' : getOperatorsForField(field)[0];
    const possibleOperation = fieldToOperation('other', field, possibleOperator);
    const isMultiOperation = isApplicableForCardinality(firstQuery.select[0].operator, 'multi');
    const extendedQueryState = {
      ...visModel,
      queries: {
        ...visModel.queries,
        [firstQueryKey]: {
          ...firstQuery,
          select: isMultiOperation
            ? [possibleOperation, ...firstQuery.select]
            : [...firstQuery.select, possibleOperation],
        },
      },
    };
    const suggestion = getSuggestions(extendedQueryState).sort(
      ({ score: scoreA }, { score: scoreB }) => (scoreA < scoreB ? 1 : -1)
    )[0];

    onChangeVisModel({
      ...prefillPrivateState(suggestion.visModel),
      editorPlugin: suggestion.pluginName,
    });
  };

  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Metric</span>
        <AxisEditor
          operationId={firstOperation!}
          visModel={visModel}
          onChangeVisModel={onChangeVisModel}
        />
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Second dimension</span>
        <Draggable canHandleDrop={(f: DatasourceField) => true} onDrop={onDropField}>
          Drop another field here
        </Draggable>
        />
      </div>
    </>
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
  const possibleOperator = field.type === 'number' ? 'avg' : getOperatorsForField(field)[0];
  const possibleOperation = fieldToOperation('metric', field, possibleOperator);
  const prefilledState = prefillPrivateState({
    ...visModel,
    queries: { q1: { select: [possibleOperation] } },
  });

  return [buildSuggestion(prefilledState)];
}

export const config: EditorPlugin<MetricChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions,
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
