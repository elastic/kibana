/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSuperSelect } from '@elastic/eui';
import { get, set } from 'lodash/fp';
import React from 'react';
import { columnSummary } from '../common/components/config_panel';
import { IndexPatternPanel } from '../common/components/index_pattern_panel';
import { Axis, selectColumn, ViewModel } from '../common/lib';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

interface PieChartPrivateState {
  sliceAxis: Axis;
  angleAxis: Axis;
}

type PieChartViewModel = ViewModel<'pieChart', PieChartPrivateState>;

function dataPanel({ viewModel }: PanelComponentProps<PieChartViewModel>) {
  return <IndexPatternPanel indexPatterns={viewModel.indexPatterns} />;
}

function configPanel({ viewModel, onChangeViewModel }: PanelComponentProps<PieChartViewModel>) {
  const {
    private: {
      pieChart: { sliceAxis, angleAxis },
    },
  } = viewModel;
  return (
    <>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Slice pie by</span>
        {sliceAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, viewModel))}</span>
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Size slices by</span>
        {angleAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, viewModel))}</span>
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: PieChartViewModel) {
  const legacyConfig = {
    type: 'pie',
    addTooltip: true,
    addLegend: true,
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
  return `sample_data | pie_chart | kibana_pie visConfig='${JSON.stringify(legacyConfig)}'`;
}

function prefillPrivateState(viewModel: ViewModel<string, unknown>) {
  if (viewModel.private.pieChart) {
    return viewModel;
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = 'q1_0';
  const yAxisRef = 'q1_1';

  if (
    get(['queries', 'q1', 'select', 'q1_0'], viewModel) &&
    get(['queries', 'q1', 'select', 'q1_1'], viewModel)
  ) {
    return set(
      ['private', 'pieChart'],
      {
        sliceAxis: { columns: [xAxisRef] },
        angleAxis: { columns: [yAxisRef] },
      } as PieChartPrivateState,
      viewModel
    );
  } else {
    return set(
      ['private', 'xyChart'],
      {
        sliceAxis: { columns: [xAxisRef] },
        angleAxis: { columns: [yAxisRef] },
      } as PieChartPrivateState,
      viewModel
    );
  }
}

function getSuggestion(viewModel: PieChartViewModel) {
  const prefilledViewModel = prefillPrivateState(viewModel as ViewModel<
    string,
    unknown
  >) as PieChartViewModel;
  return {
    pluginName: 'pie_chart',
    previewExpression: toExpression(prefilledViewModel),
    score: 0.5,
    viewModel: prefilledViewModel,
    title: 'Standard Pie Chart',
    iconType: 'visPie',
  };
}

export const config: EditorPlugin<PieChartViewModel> = {
  name: 'pie_chart',
  toExpression,
  DataPanel: dataPanel,
  ConfigPanel: configPanel,
  getSuggestions: viewModel => [getSuggestion(viewModel)],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
