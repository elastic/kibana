/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EditorConfig, EditorPanelsBuilder, StandardVisState } from '../editorConfigRegistry';

interface SampleVisState {
  xAxisField: string;
}

const Editor: EditorPanelsBuilder<SampleVisState> = ({
  standardState,
  customState,
  onChangeCustomState,
  onChangeStandardState,
}) => {
  return {
    leftPanel: (
      <button onClick={() => onChangeCustomState({ ...customState, xAxisField: 'abc' })}>
        Select x Axis field
      </button>
    ),
    rightPanel: (
      <span>{customState.xAxisField && `Current xaxis field is ${customState.xAxisField}`}</span>
    ),
  };
};

function toExpression(standardState: StandardVisState, customState?: SampleVisState) {
  return `esqueryast ${standardState.query} | sampleVis xAxisField=${
    customState!.xAxisField
  } | render`;
}

export const config: EditorConfig<SampleVisState> = {
  editorPanels: Editor,
  toExpression,
  toSuggestionExpression: toExpression,
  suggestionScore: () => 0.5,
};
