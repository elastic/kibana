/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { columnSummary } from '../common/components/config_panel';
import { IndexPatternPanel } from '../common/components/index_pattern_panel';
import { Axis, selectColumn, ViewModel } from '../common/lib';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

type BarChartViewModel = ViewModel<
  'barChart',
  {
    xAxis: Axis;
    yAxis: Axis;
  }
>;

function dataPanel({ viewModel }: PanelComponentProps<BarChartViewModel>) {
  return <IndexPatternPanel indexPatterns={viewModel.indexPatterns} />;
}

function configPanel({ viewModel }: PanelComponentProps<BarChartViewModel>) {
  const {
    private: {
      barChart: { xAxis, yAxis },
    },
  } = viewModel;
  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Y-axis</span>
        {yAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, viewModel))}</span>
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">X-axis</span>
        {xAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, viewModel))}</span>
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: BarChartViewModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  return `esqueryast ${JSON.stringify(viewState.queries)} | bar_chart xAxisField=${JSON.stringify(
    viewState.private.barChart
  )} | bar_chart_renderer`;
}

export const config: EditorPlugin<BarChartViewModel> = {
  name: 'bar_chart',
  toExpression,
  DataPanel: dataPanel,
  ConfigPanel: configPanel,
  getSuggestions: viewModel => [
    {
      expression: toExpression(viewModel),
      score: 0.5,
      viewModel,
      title: 'Standard Bar Chart',
    },
  ],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => currentState,
};
