/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { FilterAggConfigEditor } from '../types';

export const FilterEditorForm: FilterAggConfigEditor['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
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
    </>
  );
};
