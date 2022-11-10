/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import styled from 'styled-components';

import { Form, useForm, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../case_view/translations';
import type { Content } from './schema';
import { schema } from './schema';
import { MarkdownRenderer, MarkdownEditorForm } from '../markdown_editor';

export const ContentWrapper = styled.div`
  padding: ${({ theme }) => `${theme.eui.euiSizeM} ${theme.eui.euiSizeL}`};
`;

interface UserActionMarkdownProps {
  content: string;
  id: string;
  isEditable: boolean;
  onChangeEditable: (id: string) => void;
  onSaveContent: (content: string) => void;
}

export interface UserActionMarkdownRefObject {
  setComment: (newComment: string) => void;
}

const UserActionMarkdownComponent = forwardRef<
  UserActionMarkdownRefObject,
  UserActionMarkdownProps
>(({ id, content, isEditable, onChangeEditable, onSaveContent }, ref) => {
  const editorRef = useRef();
  const initialState = { content };
  const { form } = useForm<Content>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const fieldName = 'content';
  const { setFieldValue, submit } = form;

  const handleCancelAction = useCallback(() => {
    onChangeEditable(id);
  }, [id, onChangeEditable]);

  const handleSaveAction = useCallback(async () => {
    const { isValid, data } = await submit();

    if (isValid && data.content !== content) {
      onSaveContent(data.content);
    }
    onChangeEditable(id);
  }, [content, id, onChangeEditable, onSaveContent, submit]);

  const setComment = useCallback(
    (newComment) => {
      setFieldValue(fieldName, newComment);
    },
    [setFieldValue]
  );

  const EditorButtons = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="user-action-cancel-markdown"
            size="s"
            onClick={handleCancelAction}
            iconType="cross"
          >
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="user-action-save-markdown"
            color="success"
            fill
            iconType="save"
            onClick={handleSaveAction}
            size="s"
          >
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [handleCancelAction, handleSaveAction]
  );

  useImperativeHandle(ref, () => ({
    setComment,
    editor: editorRef.current,
  }));

  return isEditable ? (
    <Form form={form} data-test-subj="user-action-markdown-form">
      <UseField
        path={fieldName}
        component={MarkdownEditorForm}
        componentProps={{
          ref: editorRef,
          'aria-label': 'Cases markdown editor',
          value: content,
          id,
          bottomRightContent: EditorButtons,
        }}
      />
    </Form>
  ) : (
    <ContentWrapper className={'eui-xScroll'} data-test-subj="user-action-markdown">
      <MarkdownRenderer>{content}</MarkdownRenderer>
    </ContentWrapper>
  );
});

UserActionMarkdownComponent.displayName = 'UserActionMarkdownComponent';

export const UserActionMarkdown = React.memo(UserActionMarkdownComponent);
