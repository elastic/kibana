/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  // @ts-ignore
  EuiListGroupItem,
} from '@elastic/eui';
import React from 'react';
import { EditorConfig, EditorPanelsBuilder, StandardVisState } from '../editor_config_registry';

interface SampleVisState {
  xAxisField: string;
}

const Editor: EditorPanelsBuilder<SampleVisState> = ({ customState, onChangeCustomState }) => {
  const fields = ['Field 1', 'Field 2', 'Field 3', 'Field 4'];
  return {
    leftPanel: (
      <>
        TODO: Use Chris' data panel here
        <EuiListGroup>
          {fields.map((field, index) => (
            <EuiListGroupItem label={field} />
          ))}
        </EuiListGroup>
        )}
      </>
    ),
    rightPanel: (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <button onClick={() => onChangeCustomState({ ...customState, xAxisField: 'abc' })}>
            Select x Axis field
          </button>
        </EuiFlexItem>
        <EuiFlexItem>
          <span>
            {customState.xAxisField && `Current xaxis field is ${customState.xAxisField}`}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
};

function toExpression(standardState: StandardVisState, customState?: SampleVisState) {
  return `esqueryast ${JSON.stringify(standardState.query)} | sampleVis xAxisField=${
    customState!.xAxisField
  } | render`;
}

export const config: EditorConfig<SampleVisState> = {
  editorPanels: Editor,
  toExpression,
  getSuggestions: (standardVisState, customVisState) => [
    {
      expression: toExpression(standardVisState, customVisState),
      score: 0.5,
      standardVisState,
      customVisState,
      title: 'Sample Vis',
    },
  ],
  defaultCustomState: { xAxisField: 'not initialized' },
  defaultStandardState: { query: {}, title: 'Unsaved Sample Vis', columns: [] },
};
