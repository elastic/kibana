/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FilterAggConfigEditor } from '../types';

export const FilterEditorForm: FilterAggConfigEditor['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
  isValid,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <CodeEditor
        height={300}
        languageId={'json'}
        onChange={(d) => {
          onChange({ config: d });
        }}
        options={{
          automaticLayout: true,
          fontSize: 12,
          scrollBeyondLastLine: false,
          quickSuggestions: true,
          minimap: {
            enabled: false,
          },
          wordWrap: 'on',
          wrappingIndent: 'indent',
        }}
        value={config || ''}
      />
      {isValid === false ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut color="danger" iconType="warning" size="s">
            <FormattedMessage
              id="xpack.transform.agg.filterEditorForm.jsonInvalidErrorMessage"
              defaultMessage="JSON is invalid."
            />
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
};
