/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';

import { Field, getUseField, UseField } from '../../shared_imports';
import { CodeEditorField } from './code_editor_field';

export const CommonUseField = getUseField({ component: Field });

const SavedQueryFormComponent = () => (
  <>
    <CommonUseField path="name" />
    <EuiSpacer />
    <CommonUseField path="description" />
    <EuiSpacer />
    <UseField path="query" component={CodeEditorField} />
    <EuiSpacer />
    <CommonUseField
      path="platform"
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      euiFieldProps={{
        options: [
          { value: 'darwin', text: 'macOS' },
          { value: 'linux', text: 'Linux' },
          { value: 'windows', text: 'Windows' },
          { value: 'all', text: 'All' },
        ],
      }}
    />
    <EuiSpacer />
    <CommonUseField path="version" />
  </>
);

export const SavedQueryForm = React.memo(SavedQueryFormComponent);
