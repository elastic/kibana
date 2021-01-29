/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

jest.mock('../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../src/plugins/kibana_react/public');

  const CodeEditorMock = (props: any) => (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-value={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.target.value);
      }}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        value={props.selectedOptions[0]?.value}
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
  };
});
