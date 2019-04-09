/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ColumnOperation, DatasourceField, fieldToOperation } from '../../../common';
import {
  Axis,
  EditorPlugin,
  getColumnIdByIndex,
  getTypes,
  selectColumn,
  Suggestion,
  UnknownVisModel,
  updatePrivateState,
  VisModel,
  VisualizationPanelProps,
} from '../../../public';
import { AxisEditor } from './axis_editor';

interface ScatterChartPrivateState {
  xAxis: Axis;
  yAxis: Axis;
  hasDate: boolean;
}

type ScatterChartVisModel = VisModel<'scatterChart', ScatterChartPrivateState>;

const updateScatterState = updatePrivateState<'scatterChart', ScatterChartPrivateState>(
  'scatterChart'
);

function configPanel({
  visModel,
  onChangeVisModel,
}: VisualizationPanelProps<ScatterChartVisModel>) {
  if (!visModel.private.scatterChart) {
    return <>No chart configured</>;
  }

  const {
    private: {
      scatterChart: { xAxis, yAxis },
    },
  } = visModel;

  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Y-axis</span>
        {yAxis.columns.map(col => (
          <AxisEditor key={col} col={col} visModel={visModel} onChangeVisModel={onChangeVisModel} />
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">X-axis</span>
        {xAxis.columns.map(col => (
          <AxisEditor key={col} col={col} visModel={visModel} onChangeVisModel={onChangeVisModel} />
        ))}
      </div>
    </>
  );
}

function toExpression(visModel: ScatterChartVisModel, mode: 'edit' | 'view' | 'preview' = 'view') {
  if (
    !visModel.private.scatterChart ||
    !visModel.private.scatterChart.xAxis.columns[0] ||
    !visModel.private.scatterChart.yAxis.columns[0]
  ) {
    return '';
  }

  const {
    private: {
      scatterChart: { xAxis, yAxis, hasDate },
    },
  } = visModel;

  const xColumn = selectColumn(xAxis.columns[0], visModel) as ColumnOperation;
  const yColumn = selectColumn(yAxis.columns[0], visModel) as ColumnOperation;

  const xScaleType = hasDate ? 'time' : 'linear';

  const scatterSpec = `
  {
    "$schema": "https://vega.github.io/schema/vega/v4.json",
    "data": [{
      "name": "table",
      "values": EXPRESSION_DATA_HERE
    }],

    "scales": [
      {
        "name": "x",
        "type": "${xScaleType}",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": {"data": "table", "field": "${xColumn && xColumn.argument.field}"},
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": {"data": "table", "field": "${yColumn && yColumn.argument.field}"},
        "range": "height"
      }
    ],

    ${
      mode !== 'preview'
        ? `"axes": [
      {
        "scale": "x",
        "grid": true,
        "domain": true,
        "orient": "bottom",
        "tickCount": 5,
        "title": "${xAxis.title}"
      },
      {
        "scale": "y",
        "grid": true,
        "domain": true,
        "orient": "left",
        "titlePadding": 5,
        "title": "${yAxis.title}"
      }
    ],`
        : ''
    }

    "marks": [
      {
        "name": "marks",
        "type": "symbol",
        "from": {"data": "table"},
        "encode": {
          "update": {
            "x": {"scale": "x", "field": "${xColumn && xColumn.argument.field}"},
            "y": {"scale": "y", "field": "${yColumn && yColumn.argument.field}"},
            "shape": {"value": "circle"},
            "strokeWidth": {"value": 2},
            "opacity": {"value": 0.5},
            "stroke": {"value": "#4682b4"},
            "fill": {"value": "transparent"}
          }
        }
      }
    ]
  }
  `;

  // TODO prob. do this on an AST object and stringify afterwards
  return `vega_data_prep from='now-2M' to='now' spec='${scatterSpec.replace(
    /\n/g,
    ''
  )}' | vega spec=''`;
}

function prefillPrivateState(visModel: UnknownVisModel) {
  if (visModel.private.scatterChart) {
    return visModel as ScatterChartVisModel;
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
  const yAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);

  if (xAxisRef && yAxisRef) {
    return updateScatterState(visModel, {
      xAxis: { title: 'X Axis', columns: [xAxisRef] },
      yAxis: { title: 'Y Axis', columns: [yAxisRef] },
    });
  } else {
    return updateScatterState(visModel, {
      xAxis: { title: 'X Axis', columns: [] },
      yAxis: { title: 'Y Axis', columns: [] },
    });
  }
}

function getChartSuggestions(visModel: ScatterChartVisModel): Suggestion[] {
  if (Object.keys(visModel.queries).length === 0) {
    return [];
  }
  if (!visModel.datasource) {
    return [];
  }
  const firstQuery = Object.values(visModel.queries)[0];
  const containsNonNumberColumns = getTypes(firstQuery, visModel.datasource.fields).some(
    type => type !== 'number'
  );
  if (containsNonNumberColumns) {
    return [];
  }
  const prefilledVisModel = prefillPrivateState(
    visModel as UnknownVisModel
  ) as ScatterChartVisModel;

  return [
    {
      previewExpression: toExpression(prefilledVisModel, 'preview'),
      score: 0.5,
      visModel: prefilledVisModel,
      title: 'Basic Scatter Chart',
      iconType: 'visHeatmap',
      pluginName: 'scatter_chart',
      category: 'Scatter Chart',
    },
  ];
}

function getSuggestionsForField(
  datasourceName: string,
  field: DatasourceField,
  visModel: ScatterChartVisModel
): Suggestion[] {
  if (field.type !== 'number') {
    return [];
  }

  const { datasource } = visModel;

  const select: ColumnOperation[] = [
    { ...(fieldToOperation(field, 'column') as ColumnOperation), alias: '0' },
    { ...(fieldToOperation(field, 'column') as ColumnOperation), alias: '1' },
  ];

  let hasDate = false;

  if (datasource && datasource!.timeFieldName && datasource!.timeFieldName !== field.name) {
    hasDate = true;
    select[1] = {
      ...(fieldToOperation(
        datasource.fields.find(f => f.name === datasource.timeFieldName)!,
        'column'
      ) as ColumnOperation),
      alias: '1',
    };
  }

  const prefilledVisModel: ScatterChartVisModel = {
    ...visModel,
    queries: {
      q1: {
        datasourceRef: datasourceName,
        select,
      },
    },
    editorPlugin: 'scatter_chart',
    private: {
      ...visModel.private,
      scatterChart: {
        xAxis: { title: 'X Axis', columns: [`q1_1`] },
        yAxis: { title: 'Y Axis', columns: [`q1_0`] },
        hasDate,
      },
    },
  };

  return [
    {
      previewExpression: toExpression(prefilledVisModel, 'preview'),
      score: 0.5,
      visModel: prefilledVisModel,
      title: `Scatter Chart: ${select[1].argument!.field} vs ${select[0].argument!.field}`,
      iconType: 'visHeatmap',
      pluginName: 'scatter_chart',
      category: 'Scatter chart',
    },
  ];
}

export const config: EditorPlugin<ScatterChartVisModel> = {
  name: 'xy_chart',
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions,
  getSuggestionsForField,
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
