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
import { columnSummary } from '../public/common/components/config_panel';
import { IndexPatternPanel } from '../public/common/components/index_pattern_panel';
import {
  Axis,
  getColumnIdByIndex,
  selectColumn,
  setPrivateState,
  UnknownVisModel,
  VisModel,
} from '../public/common/lib';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

interface XyChartPrivateState {
  xAxis: Axis;
  yAxis: Axis;
  displayType?: 'line' | 'area';
}

type XyChartVisModel = VisModel<'xyChart', XyChartPrivateState>;

const setXyState = setPrivateState<'xyChart', XyChartPrivateState>('xyChart');

function dataPanel({ visModel, onChangeVisModel }: PanelComponentProps<XyChartVisModel>) {
  return (
    <IndexPatternPanel
      indexPatterns={visModel.indexPatterns}
      onChangeIndexPatterns={indexPatterns => {
        onChangeVisModel({ ...visModel, indexPatterns });
      }}
    />
  );
}

function configPanel({ visModel, onChangeVisModel }: PanelComponentProps<XyChartVisModel>) {
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
          onChange={(value: string) => {
            const updatedVisModel = setWith(
              clone(visModel),
              'private.xyChart.displayType',
              value,
              clone
            );
            onChangeVisModel(updatedVisModel);
          }}
        />
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Y-axis</span>
        {yAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, visModel))}</span>
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">X-axis</span>
        {xAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, visModel))}</span>
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: XyChartVisModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  // TODO actually use the stuff from the viewState
  return `sample_data | xy_chart displayType=${viewState.private.xyChart.displayType || 'line'}`;
}

function prefillPrivateState(visModel: UnknownVisModel, displayType?: string) {
  if (visModel.private.xyChart) {
    if (displayType) {
      return setWith(clone(visModel), 'private.xyChart.displayType', displayType, clone);
    } else {
      return visModel;
    }
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
  const yAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);

  if (xAxisRef && yAxisRef) {
    return setXyState(visModel, {
      xAxis: { title: 'X Axis', columns: [xAxisRef] },
      yAxis: { title: 'Y Axis', columns: [yAxisRef] },
    });
  } else {
    return setXyState(visModel, {
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

export const config: EditorPlugin<XyChartVisModel> = {
  name: 'xy_chart',
  toExpression,
  DataPanel: dataPanel,
  ConfigPanel: configPanel,
  getSuggestions: visModel => [
    getSuggestion(visModel, 'line', 'Standard line chart'),
    getSuggestion(visModel, 'area', 'Standard area chart'),
  ],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
