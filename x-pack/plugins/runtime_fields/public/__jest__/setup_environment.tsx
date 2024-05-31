/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@kbn/code-editor-mock/jest_helper';

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
