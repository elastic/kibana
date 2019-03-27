/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiTextArea } from '@elastic/eui';
import React, { useState } from 'react';
import { UnknownVisModel, updatePrivateState, VisModel } from '../public/common/lib';
import { EditorPlugin, PanelComponentProps } from '../public/editor_plugin_registry';

interface VegaChartPrivateState {
  spec: string;
}

type VegaChartVisModel = VisModel<'vegaChart', VegaChartPrivateState>;

const updateVegaState = updatePrivateState<'vegaChart', VegaChartPrivateState>('vegaChart');
const updateSpec = (visModel: VegaChartVisModel, spec: string) =>
  updateVegaState(visModel, { spec });

function dataPanel({ visModel, onChangeVisModel }: PanelComponentProps<VegaChartVisModel>) {
  return (
    <>
      The following query is used to fetch data (not implemented yet):
      <EuiTextArea
        style={{ height: 400 }}
        fullWidth
        readOnly
        value={JSON.stringify(visModel.queries, null, 2)}
      />
    </>
  );
}

function configPanel({ visModel, onChangeVisModel }: PanelComponentProps<VegaChartVisModel>) {
  const [text, updateText] = useState(visModel.private.vegaChart.spec);
  return (
    <>
      <EuiTextArea
        style={{ height: 400 }}
        fullWidth
        placeholder="This is the vega spec"
        value={text}
        onChange={({ target: { value } }) => updateText(value)}
      />
      <EuiButton onClick={() => onChangeVisModel(updateSpec(visModel, text))}>Apply</EuiButton>
    </>
  );
}

function toExpression(viewState: VegaChartVisModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  return `sample_data | vega_data_prep from='now-2M' to='now' spec='${viewState.private.vegaChart.spec.replace(
    /\n/g,
    ''
  )}' | vega spec=''`;
}

function prefillPrivateState(visModel: UnknownVisModel) {
  if (visModel.private.vegaChart) {
    return visModel as VegaChartVisModel;
  }

  return {
    ...visModel,
    private: {
      ...visModel.private,
      vegaChart: {
        spec: '',
      },
    },
  };
}

function getSuggestion(visModel: VegaChartVisModel) {
  const prefilledVisModel = prefillPrivateState(visModel as UnknownVisModel) as VegaChartVisModel;
  return {
    pluginName: 'vega_chart',
    previewExpression: toExpression(prefilledVisModel),
    score: 0.5,
    visModel: prefilledVisModel,
    title: 'Vega Chart',
    iconType: 'visVega',
  };
}

export const config: EditorPlugin<VegaChartVisModel> = {
  name: 'vega_chart',
  toExpression,
  DataPanel: dataPanel,
  ConfigPanel: configPanel,
  getChartSuggestions: visModel => [getSuggestion(visModel)],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
