/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';

import { CodeEditor, UseField } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';

export const PainlessScriptParameter = () => {
  return (
    <UseField path="script.source" config={getFieldConfig('script')}>
      {(scriptField) => {
        const error = scriptField.getErrorsMessages();
        const isInvalid = error ? Boolean(error.length) : false;

        return (
          <EuiFormRow label={scriptField.label} error={error} isInvalid={isInvalid} fullWidth>
            <CodeEditor
              languageId="painless"
              // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
              width="99%"
              height="400px"
              value={scriptField.value as string}
              onChange={scriptField.setValue}
              options={{
                fontSize: 12,
                minimap: {
                  enabled: false,
                },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
              }}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
