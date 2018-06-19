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

export function EventOutput({ value }) {
  return (
    <EuiFormRow label="Structured Data">
      <EuiCodeEditor
        width="100%"
        height="340px"
        value={value}
        data-test-subj="aceEventOutput"
        isReadOnly
      />
    </EuiFormRow>
  );
}
