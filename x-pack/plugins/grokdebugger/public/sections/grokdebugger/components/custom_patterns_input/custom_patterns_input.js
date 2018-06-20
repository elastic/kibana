/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiFormRow,
  EuiCodeEditor,
  EuiSpacer
} from '@elastic/eui';

export function CustomPatternsInput({ value, onChange }) {
  const sampleCustomPatterns = `POSTFIX_QUEUEID [0-9A-F]{10,11}
MSG message-id=<%{GREEDYDATA}>`;

  return (
    <EuiAccordion
      id="customPatternsInput"
      buttonContent="Custom Patterns"
      data-test-subj="btnToggleCustomPatternsInput"
    >
      <EuiCallOut
        title="Enter one custom pattern per line. For example:"
      >
        <EuiCodeBlock>
          { sampleCustomPatterns }
        </EuiCodeBlock>
      </EuiCallOut>

      <EuiSpacer />

      <EuiFormRow>
        <EuiCodeEditor
          width="100%"
          height="51px"
          value={value}
          onChange={onChange}
          setOptions={{
            highlightActiveLine: false,
            highlightGutterLine: false,
            minLines: 3,
            maxLines: 10,
          }}
          data-test-subj="aceCustomPatternsInput"
        />
      </EuiFormRow>
    </EuiAccordion>
  );
}
