/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSuperSelect } from '@elastic/eui';
import clone from 'lodash-es/clone';
import setWith from 'lodash-es/setWith';
import React from 'react';
import { columnSummary } from '../common/components/config_panel';
import { IndexPatternPanel } from '../common/components/index_pattern_panel';
import { Axis, selectColumn, ViewModel } from '../common/lib';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

interface XyChartPrivateState {
  xAxis: Axis;
  yAxis: Axis;
  displayType?: 'line' | 'area';
}

type XyChartViewModel = ViewModel<'xyChart', XyChartPrivateState>;

function dataPanel({ viewModel, onChangeViewModel }: PanelComponentProps<XyChartViewModel>) {
  return (
    <IndexPatternPanel
      indexPatterns={viewModel.indexPatterns}
      onChangeIndexPatterns={indexPatterns => {
        onChangeViewModel({ ...viewModel, indexPatterns });
      }}
    />
  );
}

function configPanel({ viewModel, onChangeViewModel }: PanelComponentProps<XyChartViewModel>) {
  const {
    private: {
      xyChart: { xAxis, yAxis, displayType },
    },
  } = viewModel;
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
          onChange={(value: string) => {
            const updatedViewModel = setWith(
              clone(viewModel),
              'private.xyChart.displayType',
              value,
              clone
            );
            onChangeViewModel(updatedViewModel);
          }}
        />
      </div>
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

function toExpression(viewState: XyChartViewModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  // TODO actually use the stuff from the viewState
  return `sample_data | xy_chart displayType=${viewState.private.xyChart.displayType || 'line'}`;
}

function prefillPrivateState(viewModel: ViewModel<string, unknown>, displayType?: string) {
  if (viewModel.private.xyChart) {
    if (displayType) {
      return setWith(clone(viewModel), 'private.xyChart.displayType', displayType, clone);
    } else {
      return viewModel;
    }
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = 'q1_0';
  const yAxisRef = 'q1_1';

  if (viewModel.queries.q1!.select.q1_0 && viewModel.queries.q1!.select.q1_1) {
    return setWith(
      clone(viewModel),
      'private.xyChart',
      {
        xAxis: { columns: [xAxisRef] },
        yAxis: { columns: [yAxisRef] },
      } as XyChartPrivateState,
      clone
    );
  } else {
    return setWith(
      clone(viewModel),
      'private.xyChart',
      {
        xAxis: { columns: [] as string[] },
        yAxis: { columns: [] as string[] },
      } as XyChartPrivateState,
      clone
    );
  }
}

const displayTypeIcon = {
  line: 'visLine',
  area: 'visArea',
};

function getSuggestion(viewModel: XyChartViewModel, displayType: 'line' | 'area', title: string) {
  const prefilledViewModel = prefillPrivateState(
    viewModel as ViewModel<string, unknown>,
    displayType
  ) as XyChartViewModel;
  return {
    previewExpression: toExpression(prefilledViewModel),
    score: 0.5,
    viewModel: prefilledViewModel,
    title,
    iconType: displayTypeIcon[displayType],
    pluginName: 'xy_chart',
  };
}

export const config: EditorPlugin<XyChartViewModel> = {
  name: 'xy_chart',
  toExpression,
  DataPanel: dataPanel,
  ConfigPanel: configPanel,
  getSuggestions: viewModel => [
    getSuggestion(viewModel, 'line', 'Standard line chart'),
    getSuggestion(viewModel, 'area', 'Standard area chart'),
  ],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
