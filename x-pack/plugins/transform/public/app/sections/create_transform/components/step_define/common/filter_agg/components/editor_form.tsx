/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCodeEditor, EuiSpacer } from '@elastic/eui';
import { FilterAggConfigEditor } from '../types';

export const FilterEditorForm: FilterAggConfigEditor['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCodeEditor
        value={config}
        onChange={(d) => {
          onChange({ config: d });
        }}
        mode="json"
        style={{ width: '100%' }}
        theme="textmate"
        height="300px"
      />
    </>
  );
};
