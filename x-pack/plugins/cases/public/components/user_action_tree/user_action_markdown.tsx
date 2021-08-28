/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Form } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form';
import { UseField } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/use_field';
import { useForm } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import * as i18n from '../case_view/translations';
import { MarkdownEditorForm } from '../markdown_editor/eui_form';
import { MarkdownRenderer } from '../markdown_editor/renderer';
import type { Content } from './schema';
import { schema } from './schema';

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

interface UserActionMarkdownRefObject {
  setComment: (newComment: string) => void;
}

export const UserActionMarkdown = forwardRef<UserActionMarkdownRefObject, UserActionMarkdownProps>(
  ({ id, content, isEditable, onChangeEditable, onSaveContent }, ref) => {
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
      if (isValid) {
        onSaveContent(data.content);
      }
      onChangeEditable(id);
    }, [id, onChangeEditable, onSaveContent, submit]);

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
              color="secondary"
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
      <ContentWrapper data-test-subj="user-action-markdown">
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </ContentWrapper>
    );
  }
);
