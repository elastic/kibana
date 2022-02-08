/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import styled from 'styled-components';
import { EuiMarkdownEditorProps, EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../common/shared_imports';
import { MarkdownEditor, MarkdownEditorRef } from './editor';
import { CommentEditorContext } from './context';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseTags?: string[];
  disabledUiPlugins?: string[];
};

const BottomContentWrapper = styled(EuiFlexGroup)`
  ${({ theme }) => `
    padding: ${theme.eui.ruleMargins.marginSmall} 0;
  `}
`;

export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(
    (
      {
        id,
        field,
        dataTestSubj,
        idAria,
        bottomRightContent,
        caseTitle,
        caseTags,
        disabledUiPlugins,
      },
      ref
    ) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

      const commentEditorContextValue = useMemo(
        () => ({
          editorId: id,
          value: field.value,
          caseTitle,
          caseTags,
        }),
        [id, field.value, caseTitle, caseTags]
      );

      return (
        <CommentEditorContext.Provider value={commentEditorContextValue}>
          <EuiFormRow
            data-test-subj={dataTestSubj}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
            error={errorMessage}
            helpText={field.helpText}
            isInvalid={isInvalid}
            label={field.label}
            labelAppend={field.labelAppend}
          >
            <MarkdownEditor
              ref={ref}
              ariaLabel={idAria}
              editorId={id}
              onChange={field.setValue}
              value={field.value}
              disabledUiPlugins={disabledUiPlugins}
              data-test-subj={`${dataTestSubj}-markdown-editor`}
            />
          </EuiFormRow>
          {bottomRightContent && (
            <BottomContentWrapper justifyContent={'flexEnd'}>
              <EuiFlexItem grow={false}>{bottomRightContent}</EuiFlexItem>
            </BottomContentWrapper>
          )}
        </CommentEditorContext.Provider>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
