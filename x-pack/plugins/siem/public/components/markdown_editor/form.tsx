/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback } from 'react';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../shared_imports';
import { CursorPosition, MarkdownEditor } from '.';

interface IMarkdownEditorForm {
  bottomRightContent?: React.ReactNode;
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  onCursorPositionUpdate?: (cursorPosition: CursorPosition) => void;
  placeholder?: string;
  topRightContent?: React.ReactNode;
}
export const MarkdownEditorForm = ({
  bottomRightContent,
  dataTestSubj,
  field,
  idAria,
  isDisabled = false,
  onCursorPositionUpdate,
  placeholder,
  topRightContent,
}: IMarkdownEditorForm) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const handleContentChange = useCallback(
    (newContent: string) => {
      field.setValue(newContent);
    },
    [field]
  );

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
      <MarkdownEditor
        bottomRightContent={bottomRightContent}
        content={field.value as string}
        isDisabled={isDisabled}
        onChange={handleContentChange}
        onCursorPositionUpdate={onCursorPositionUpdate}
        placeholder={placeholder}
        topRightContent={topRightContent}
      />
    </EuiFormRow>
  );
};
