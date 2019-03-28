/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { SelectOperation, TermsOperation } from '../common';
import { columnSummary } from '../public/common/components/config_panel';
import {
  Axis,
  Field,
  getColumnIdByIndex,
  selectColumn,
  UnknownVisModel,
  updatePrivateState,
  VisModel,
} from '../public/common/lib';
import { getOperationsForField } from '../public/common/lib/field_config';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

interface XyChartPrivateState {
  xAxis: Axis;
  yAxis: Axis;
  displayType?: 'line' | 'area';
}

type XyChartVisModel = VisModel<'xyChart', XyChartPrivateState>;

const updateXyState = updatePrivateState<'xyChart', XyChartPrivateState>('xyChart');

function configPanel({ visModel, onChangeVisModel }: PanelComponentProps<XyChartVisModel>) {
  if (!visModel.private.xyChart) {
    updateXyState(visModel, {});

    return <>No chart configured</>;
  }

  const {
    private: {
      xyChart: { xAxis, yAxis, displayType },
    },
  } = visModel;

  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Display type</span>
        <EuiSuperSelect
          options={[
            {
              value: 'line',
              inputDisplay: 'Line',
            },
            {
              value: 'area',
              inputDisplay: 'Area',
            },
          ]}
          valueOfSelected={displayType || 'line'}
          onChange={(value: 'line' | 'area') => {
            const updatedVisModel = updateXyState(visModel, { displayType: value });
            onChangeVisModel(updatedVisModel);
          }}
        />
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Y-axis</span>
        {yAxis.columns.map(col => (
          <span key={col}>{columnSummary(selectColumn(col, visModel))}</span>
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">X-axis</span>
        {xAxis.columns.map(col => (
          <span key={col}>{columnSummary(selectColumn(col, visModel))}</span>
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: XyChartVisModel) {
  if (!viewState.private.xyChart) {
    return '';
  }

  // TODO prob. do this on an AST object and stringify afterwards
  // TODO actually use the stuff from the viewState
  return `xy_chart displayType=${viewState.private.xyChart.displayType || 'line'}`;
}

function prefillPrivateState(visModel: UnknownVisModel, displayType?: 'line' | 'area') {
  if (!visModel.private.xyChart) {
    // visModel
  }

  if (visModel.private.xyChart) {
    if (displayType) {
      return updateXyState(visModel, { displayType });
    } else {
      return visModel as XyChartVisModel;
    }
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
  const yAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);

  if (xAxisRef && yAxisRef) {
    return updateXyState(visModel, {
      xAxis: { title: 'X Axis', columns: [xAxisRef] },
      yAxis: { title: 'Y Axis', columns: [yAxisRef] },
    });
  } else {
    return updateXyState(visModel, {
      xAxis: { title: 'X Axis', columns: [] },
      yAxis: { title: 'Y Axis', columns: [] },
    });
  }
}

const displayTypeIcon = {
  line: 'visLine',
  area: 'visArea',
};

function getSuggestion(visModel: XyChartVisModel, displayType: 'line' | 'area', title: string) {
  const prefilledVisModel = prefillPrivateState(
    visModel as UnknownVisModel,
    displayType
  ) as XyChartVisModel;
  return {
    previewExpression: toExpression(prefilledVisModel),
    score: 0.5,
    visModel: prefilledVisModel,
    title,
    iconType: displayTypeIcon[displayType],
    pluginName: 'xy_chart',
  };
}

function getSuggestionsForField(indexPatternName: string, field: Field, visModel: XyChartVisModel) {
  const operationNames = getOperationsForField(field);

  if (operationNames.length === 0) {
    return [];
  }

  let firstOperation: SelectOperation;

  if (operationNames[0] === 'terms') {
    firstOperation = {
      operation: 'terms',
      argument: { field: field.name, count: 5 },
    };
  } else if (operationNames[0] === 'date_histogram') {
    firstOperation = {
      operation: 'date_histogram',
      argument: { field: field.name, interval: '1d' },
    };
  } else if (operationNames[0] === 'count') {
    firstOperation = { operation: 'count' };
  } else {
    firstOperation = {
      operation: operationNames[0],
      argument: { field: field.name },
    } as Exclude<SelectOperation, TermsOperation>;
  }

  // Replaces the whole query and both axes. Good for first field, not for 2+
  const prefilledVisModel: XyChartVisModel = {
    ...visModel,
    queries: {
      q1: {
        datasourceRef: indexPatternName,
        select: [{ ...firstOperation, alias: field.name }, { operation: 'count', alias: 'count' }],
      },
    },
    private: {
      ...visModel.private,
      xyChart: {
        xAxis: { title: 'X Axis', columns: ['q1_0'] },
        yAxis: { title: 'Y Axis', columns: ['q1_1'] },
      },
    },
  };

  return [
    {
      previewExpression: toExpression(prefilledVisModel),
      score: 0.5,
      visModel: prefilledVisModel,
      title: 'Basic Line Chart',
      iconType: displayTypeIcon.line,
      pluginName: 'xy_chart',
    },
  ];
}

export const config: EditorPlugin<XyChartVisModel> = {
  name: 'xy_chart',
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions: visModel => [
    getSuggestion(visModel, 'line', 'Standard line chart'),
    getSuggestion(visModel, 'area', 'Standard area chart'),
  ],
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
