/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiMarkdownEditor, EuiMarkdownEditorProps, EuiFormRow } from '@elastic/eui';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../shared_imports';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
};

export const MarkdownEditorForm: React.FC<MarkdownEditorFormProps> = ({
  id,
  field,
  dataTestSubj,
  idAria,
  bottomRightContent,
}) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={field.helpText}
      isInvalid={isInvalid}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <>
        <EuiMarkdownEditor
          aria-label={idAria}
          editorId={id}
          onChange={field.setValue}
          value={field.value as string}
        />
        {bottomRightContent}
      </>
    </EuiFormRow>
  );
};
