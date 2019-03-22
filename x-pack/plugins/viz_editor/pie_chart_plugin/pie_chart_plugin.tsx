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
  UnknownVisModel,
  VisModel,
} from '../public/common/lib';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

interface PieChartPrivateState {
  sliceAxis: Axis;
  angleAxis: Axis;
}

type PieChartVisModel = VisModel<'pieChart', PieChartPrivateState>;

function dataPanel({ visModel, onChangeVisModel }: PanelComponentProps<PieChartVisModel>) {
  return (
    <IndexPatternPanel
      indexPatterns={visModel.indexPatterns}
      onChangeIndexPatterns={indexPatterns => {
        onChangeVisModel({ ...visModel, indexPatterns });
      }}
    />
  );
}

function configPanel({ visModel, onChangeVisModel }: PanelComponentProps<PieChartVisModel>) {
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
          <span>{columnSummary(selectColumn(col, visModel))}</span>
        ))}
      </div>
      <div className="configPanel-axis">
        <span className="configPanel-axis-title">Size slices by</span>
        {angleAxis.columns.map(col => (
          <span>{columnSummary(selectColumn(col, visModel))}</span>
        ))}
      </div>
    </>
  );
}

function toExpression(viewState: PieChartVisModel) {
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

function prefillPrivateState(visModel: UnknownVisModel) {
  if (visModel.private.pieChart) {
    return visModel;
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
  const yAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);

  if (xAxisRef && yAxisRef) {
    return setWith(
      clone(visModel),
      'private.pieChart',
      {
        sliceAxis: { columns: [xAxisRef] },
        angleAxis: { columns: [yAxisRef] },
      } as PieChartPrivateState,
      clone
    );
  } else {
    return setWith(
      clone(visModel),
      'private.pieChart',
      {
        sliceAxis: { columns: [] as string[] },
        angleAxis: { columns: [] as string[] },
      } as PieChartPrivateState,
      clone
    );
  }
}

function getSuggestion(visModel: PieChartVisModel) {
  const prefilledVisModel = prefillPrivateState(visModel as UnknownVisModel) as PieChartVisModel;
  return {
    pluginName: 'pie_chart',
    previewExpression: toExpression(prefilledVisModel),
    score: 0.5,
    visModel: prefilledVisModel,
    title: 'Standard Pie Chart',
    iconType: 'visPie',
  };
}

export const config: EditorPlugin<PieChartVisModel> = {
  name: 'pie_chart',
  toExpression,
  DataPanel: dataPanel,
  ConfigPanel: configPanel,
  getSuggestions: visModel => [getSuggestion(visModel)],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
