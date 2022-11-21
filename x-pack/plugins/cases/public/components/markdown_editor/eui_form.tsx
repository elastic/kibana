/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';
import { CommentEditorContext } from './context';
import useLocalStorage from 'react-use/lib/useLocalStorage';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseTags?: string[];
  caseId: string;
  disabledUiPlugins?: string[];
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
        caseId,
        disabledUiPlugins,
      },
      ref
    ) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const [contentForLocalStorage, setContentForLocalStorage] = useLocalStorage(`${caseId}.${id}.caseView.markdownEditor`, field.value);


      const commentEditorContextValue = useMemo(
        () => ({
          editorId: id,
          value: field.value,
          caseTitle,
          caseTags,
        }),
        [id, field.value, caseTitle, caseTags]
      );

      useEffect(() => {
        console.log('useeffect', contentForLocalStorage, field);
        if (contentForLocalStorage && field.value !== contentForLocalStorage) {
          field.setValue(contentForLocalStorage)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      // console.log('eui_form caseId', caseId, 'field value', field.value, 'field id', id );

      
      const onChange = (value: string) => {
        console.log('onchange', value)
        field.setValue(value);
        setContentForLocalStorage(value);
      }

    
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
              onChange={onChange}
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
