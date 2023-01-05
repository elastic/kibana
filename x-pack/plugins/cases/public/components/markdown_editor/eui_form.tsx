/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import styled from 'styled-components';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../../common/translations';
import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';
import { CommentEditorContext } from './context';
import { useMarkdownSessionStorage } from './use_markdown_session_storage';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseTags?: string[];
  draftStorageKey: string;
  disabledUiPlugins?: string[];
  initialValue?: string;
};

const BottomContentWrapper = styled(EuiFlexGroup)`
  ${({ theme }) => `
    padding: ${theme.eui.euiSizeM} 0;
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
        draftStorageKey,
        disabledUiPlugins,
        initialValue,
      },
      ref
    ) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const { hasConflicts } = useMarkdownSessionStorage({
        field,
        sessionKey: draftStorageKey,
        initialValue,
      });

      const conflictWarningText = i18n.VERSION_CONFLICT_WARNING(
        id === 'description' ? id : 'comment'
      );

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
              <EuiFlexItem grow={false}>
                <EuiText color="danger" size="s">
                  {hasConflicts && conflictWarningText}
                </EuiText>
                <EuiSpacer size="s" />
                {bottomRightContent}
              </EuiFlexItem>
            </BottomContentWrapper>
          )}
        </CommentEditorContext.Provider>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
