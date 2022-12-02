/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import * as i18n from '../../common/translations';
import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';
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
  draftCommentStorageKey?: string;
  disabledUiPlugins?: string[];
  initialValue?: string;
};

const STORAGE_DEBOUNCE_TIME = 500;

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
        draftCommentStorageKey,
        disabledUiPlugins,
        initialValue,
      },
      ref
    ) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const [showVersionConflictWarning, setShowVersionConflictWarning] = useState<boolean>(false);
      const storage = useMemo(() => new Storage(window.sessionStorage), []);
      const isFirstRender = useRef(true);

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
        const storageDraftComment = draftCommentStorageKey && storage.get(draftCommentStorageKey);
        if (storageDraftComment && storageDraftComment !== '') {
          field.setValue(storageDraftComment);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useEffect(() => {
        if (initialValue && initialValue !== field.value) {
          setShowVersionConflictWarning(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [initialValue]);

      useDebounce(
        () => {
          if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
          }
          if (draftCommentStorageKey) {
            if (field.value !== '') {
              storage.set(draftCommentStorageKey, field.value);
            } else {
              storage.remove(draftCommentStorageKey);
            }
          }
        },
        STORAGE_DEBOUNCE_TIME,
        [field.value]
      );

      return (
        <CommentEditorContext.Provider value={commentEditorContextValue}>
          <EuiFormRow
            data-test-subj={dataTestSubj}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
            error={errorMessage}
            helpText={
              showVersionConflictWarning ? i18n.COMMENT_VERSION_CONFLICT_WARNING : field.helpText
            }
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
