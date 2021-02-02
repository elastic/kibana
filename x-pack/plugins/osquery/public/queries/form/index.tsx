/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { Field, getUseField, UseField, Form } from '../../shared_imports';
import { CodeEditorField } from './code_editor_field';

export const CommonUseField = getUseField({ component: Field });

interface SavedQueryFormProps {
  actionDetails?: Record<string, string>;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}

const SavedQueryFormComponent: React.FC<SavedQueryFormProps> = ({ form }) => {
  const { submit } = form;

  return (
    <Form form={form}>
      <CommonUseField path="title" />
      <EuiSpacer />
      <CommonUseField path="description" />
      <EuiSpacer />
      <UseField path="command" component={CodeEditorField} />
      <EuiButton onClick={submit}>{'Save'}</EuiButton>
    </Form>
  );
};

export const SavedQueryForm = React.memo(SavedQueryFormComponent);
