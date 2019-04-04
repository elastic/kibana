/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField } from '../../../common';
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
import { columnSummary } from '../../common/components/config_panel';

interface ScatterChartPrivateState {
  xAxis: Axis;
  yAxis: Axis;
}

type ScatterChartVisModel = VisModel<'scatterChart', ScatterChartPrivateState>;

const updateScatterState = updatePrivateState<'scatterChart', ScatterChartPrivateState>(
  'scatterChart'
);

function configPanel({ visModel }: VisualizationPanelProps<ScatterChartVisModel>) {
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
          <span key={col}>{columnSummary(selectColumn(col as string, visModel))}</span>
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">X-axis</span>
        {xAxis.columns.map(col => (
          <span key={col}>{columnSummary(selectColumn(col as string, visModel))}</span>
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
      scatterChart: { xAxis, yAxis },
    },
  } = visModel;

  const xColumn = selectColumn(xAxis.columns[0], visModel);
  const yColumn = selectColumn(yAxis.columns[0], visModel);

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
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": {"data": "table", "field": "${xColumn && xColumn.alias}"},
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": {"data": "table", "field": "${yColumn && yColumn.alias}"},
        "range": "height"
      }
    ],

    ${
      mode !== 'preview'
        ? `"axes": [
      {
        "scale": "x",
        "grid": true,
        "domain": false,
        "orient": "bottom",
        "tickCount": 5,
        "title": "${xAxis.title}"
      },
      {
        "scale": "y",
        "grid": true,
        "domain": false,
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
            "x": {"scale": "x", "field": "${xColumn && xColumn.alias}"},
            "y": {"scale": "y", "field": "${yColumn && yColumn.alias}"},
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

  const prefilledVisModel: ScatterChartVisModel = {
    ...visModel,
    queries: {
      q1: {
        datasourceRef: datasourceName,
        select: [
          { operation: 'column', alias: field.name, argument: { field: field.name } },
          { operation: 'column', alias: field.name, argument: { field: field.name } },
        ],
      },
    },
    editorPlugin: 'scatter_chart',
    private: {
      ...visModel.private,
      scatterChart: {
        xAxis: { title: 'X Axis', columns: ['q1_0'] },
        yAxis: { title: 'Y Axis', columns: ['q1_1'] },
      },
    },
  };

  return [
    {
      previewExpression: toExpression(prefilledVisModel, 'preview'),
      score: 0.5,
      visModel: prefilledVisModel,
      title: `Scatter Chart: ${field.name} vs ${field.name}`,
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
