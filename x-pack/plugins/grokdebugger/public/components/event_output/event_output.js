/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiCodeEditor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function EventOutput({ value }) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.grokDebugger.structuredDataLabel"
          defaultMessage="Structured Data"
        />
      }
      fullWidth
      data-test-subj="aceEventOutput"
    >
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        isReadOnly
        width="100%"
        height="340px"
        value={JSON.stringify(value, null, 2)}
        setOptions={{
          highlightActiveLine: false,
          highlightGutterLine: false,
        }}
      />
    </EuiFormRow>
  );
}
