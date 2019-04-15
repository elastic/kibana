/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiTextArea } from '@elastic/eui';
import React, { useState } from 'react';
import {
  EditorPlugin,
  Suggestion,
  UnknownVisModel,
  updatePrivateState,
  VisModel,
  VisualizationPanelProps,
} from '../../../public';

interface VegaChartPrivateState {
  spec: string;
}

type VegaChartVisModel = VisModel<'vegaChart', VegaChartPrivateState>;

const updateVegaState = updatePrivateState<'vegaChart', VegaChartPrivateState>('vegaChart');
const updateSpec = (visModel: VegaChartVisModel, spec: string) =>
  updateVegaState(visModel, { spec });

function configPanel({ visModel, onChangeVisModel }: VisualizationPanelProps<VegaChartVisModel>) {
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
  return `vega_data_prep from='now-2M' to='now' spec='${viewState.private.vegaChart.spec.replace(
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
        spec: `{
          "$schema": "https://vega.github.io/schema/vega/v4.json",
          "data": [{
            "name": "table",
            "values": EXPRESSION_DATA_HERE
          }],
        
          "marks": [
            {
              "type": "text",
              "encode": {
                "update": {
                  "text": {"value": "My Vega Chart"},
                  "align": {"value": "center"},
                  "baseline": {"value": "middle"},
                  "xc": {"signal": "width/2"},
                  "yc": {"signal": "height/2"},
                  "fontSize": {"value": "14"}
                }
              }
            }
          ]
        }`,
      },
    },
  };
}

function getSuggestion(visModel: VegaChartVisModel): Suggestion {
  const prefilledVisModel = prefillPrivateState(visModel as UnknownVisModel) as VegaChartVisModel;
  return {
    pluginName: 'vega_chart',
    previewExpression: toExpression(prefilledVisModel),
    score: 0.3,
    visModel: prefilledVisModel,
    title: 'Vega Chart',
    iconType: 'visVega',
    category: 'Vega Chart',
  };
}

export const config: EditorPlugin<VegaChartVisModel> = {
  name: 'vega_chart',
  toExpression,
  ConfigPanel: configPanel,
  getChartSuggestions: visModel => [getSuggestion(visModel)],
  // this part should check whether the x and y axes have to be initialized in some way
  getInitialState: currentState => prefillPrivateState(currentState),
};
