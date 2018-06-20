/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiCodeEditor
} from '@elastic/eui';
import { EDITOR } from '../../../../../common/constants';

export function EventInput({ value, onChange }) {
  return (
    <EuiFormRow
      label="Sample Data"
      fullWidth
    >
      <EuiCodeEditor
        width="100%"
        height="51px"
        value={value}
        onChange={onChange}
        setOptions={{
          highlightActiveLine: false,
          highlightGutterLine: false,
          minLines: EDITOR.SAMPLE_DATA_MIN_LINES,
          maxLines: EDITOR.SAMPLE_DATA_MAX_LINES
        }}
        data-test-subj="aceEventInput"
      />
    </EuiFormRow>
  );
}
