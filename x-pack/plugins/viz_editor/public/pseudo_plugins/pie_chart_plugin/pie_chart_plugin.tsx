/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiSuperSelect,
  IconType,
} from '@elastic/eui';
import React from 'react';
import { DatasourceField, fieldToOperation } from '../../../common';
import {
  Axis,
  EditorPlugin,
  getColumnIdByIndex,
  getOperatorsForField,
  operationToName,
  Suggestion,
  UnknownVisModel,
  updatePrivateState,
  VisModel,
  VisualizationPanelProps,
} from '../../../public';
import { AngleAxisEditor } from './angleaxis_editor';
import { SliceAxisEditor } from './sliceaxis_editor';

const PLUGIN_NAME = 'pie_chart';

interface PieChartPrivateState {
  sliceAxis: Axis;
  angleAxis: Axis;
}

type PieChartVisModel = VisModel<'pieChart', PieChartPrivateState>;

const updatePieState = updatePrivateState<'pieChart', PieChartPrivateState>('pieChart');

function configPanel({ visModel, onChangeVisModel }: VisualizationPanelProps<PieChartVisModel>) {
  const {
    private: {
      pieChart: { sliceAxis, angleAxis },
    },
  } = visModel;
  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Slice pie by</span>
        {sliceAxis.columns.map(col => (
          <SliceAxisEditor
            key={col}
            col={col}
            visModel={visModel}
            onChangeVisModel={onChangeVisModel}
          />
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Size slices by</span>
        {angleAxis.columns.map(col => (
          <AngleAxisEditor
            key={col}
            col={col}
            visModel={visModel}
            onChangeVisModel={onChangeVisModel}
          />
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: PieChartVisModel, mode: 'preview' | 'view' | 'edit' = 'view') {
  const legacyConfig = {
    type: 'pie',
    addTooltip: mode !== 'preview',
    addLegend: mode !== 'preview',
    legendPosition: 'right',
    isDonut: true,
    labels: {
      show: false,
      values: true,
      last_level: true,
      truncate: 100,
    },
    dimensions: {
      metric: {
        accessor: 1,
        format: {
          id: 'number',
        },
        params: {},
        aggType: 'count',
      },
      buckets: [
        {
          accessor: 0,
          format: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
          params: {},
          aggType: 'terms',
        },
      ],
    },
  };
  // TODO prob. do this on an AST object and stringify afterwards
  // TODO actually use the stuff from the viewState
  return `pie_chart | kibana_pie visConfig='${JSON.stringify(legacyConfig)}'`;
}

function prefillPrivateState(visModel: UnknownVisModel) {
  if (visModel.private.pieChart) {
    return visModel as PieChartVisModel;
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);
  const yAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
  // TODO check whether we have a split series candidate

  if (xAxisRef && yAxisRef) {
    return updatePieState(visModel, {
      sliceAxis: { title: 'Slice By', columns: [xAxisRef] },
      angleAxis: { title: 'Size By', columns: [yAxisRef] },
    });
  } else {
    return updatePieState(visModel, {
      sliceAxis: { title: 'Slice By', columns: [] },
      angleAxis: { title: 'Size By', columns: [] },
    });
  }
}

function getSuggestion(visModel: PieChartVisModel): Suggestion {
  const prefilledVisModel = prefillPrivateState(visModel as UnknownVisModel) as PieChartVisModel;
  return {
    pluginName: PLUGIN_NAME,
    previewExpression: toExpression(prefilledVisModel, 'preview'),
    score: 0.5,
    visModel: prefilledVisModel,
    title: 'Standard Pie Chart',
    iconType: 'visPie',
  } as Suggestion;
}

function getSuggestionsForField(
  datasourceRef: string,
  field: DatasourceField,
  visModel: PieChartVisModel
): Suggestion[] {
  if (!field.aggregatable) {
    return [];
  }
  const operationNames = getOperatorsForField(field);

  if (operationNames.length === 0) {
    return [];
  }

  return operationNames.map(operationName => {
    const firstOperation = fieldToOperation(field, operationName);
    const formattedNameSlice = operationToName(operationName);
    const formattedNameSize = operationToName('count');

    // Replaces the whole query and both axes. Good for first field, not for 2+
    const prefilledVisModel: PieChartVisModel = {
      ...visModel,
      editorPlugin: PLUGIN_NAME,
      queries: {
        q1: {
          datasourceRef,
          select: [{ operator: 'count', alias: 'count' }, { ...firstOperation, alias: field.name }],
        },
      },
      private: {
        ...visModel.private,
        pieChart: {
          sliceAxis: { title: 'Slice By', columns: [`q1_${field.name}`] },
          angleAxis: { title: 'Size By', columns: ['q1_count'] },
        },
      },
    };

    return {
      previewExpression: toExpression(prefilledVisModel, 'preview'),
      score: 0.5,
      visModel: prefilledVisModel,
      title: `Pie Chart: ${formattedNameSlice} of ${field.name} vs ${formattedNameSize}`,
      iconType: 'visPie' as IconType,
      pluginName: PLUGIN_NAME,
      category: 'Pie chart',
    };
  });
}

export const config: EditorPlugin<PieChartVisModel> = {
  name: PLUGIN_NAME,
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions: visModel => [getSuggestion(visModel)],
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
