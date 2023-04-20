/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Content } from '../user_actions/schema';
import { MarkdownEditorForm } from '.';
import { removeItemFromSessionStorage } from '../utils';
import { useCasesContext } from '../cases_context/use_cases_context';
import { getMarkdownEditorStorageKey } from './utils';
import { EditableMarkdownFooter } from './editable_markdown_footer';
import type { UserActionMarkdownRefObject } from '../user_actions/markdown_form';

interface EditableMarkdownRendererProps {
  content: string;
  id: string;
  caseId: string;
  fieldName: string;
  onChangeEditable: (id: string) => void;
  onSaveContent: (content: string) => void;
  editorRef: React.MutableRefObject<undefined | null | UserActionMarkdownRefObject>;
  form: FormHook<Content, Content>;
}

const EditableMarkDownRenderer = ({
  id,
  content,
  caseId,
  fieldName,
  onChangeEditable,
  onSaveContent,
  editorRef,
  form,
}: EditableMarkdownRendererProps) => {
  const { appId } = useCasesContext();
  const draftStorageKey = getMarkdownEditorStorageKey(appId, caseId, id);
  const { submit } = form;

  const handleCancelAction = useCallback(() => {
    onChangeEditable(id);
    removeItemFromSessionStorage(draftStorageKey);
  }, [id, onChangeEditable, draftStorageKey]);

  const handleSaveAction = useCallback(async () => {
    const { isValid, data } = await submit();

    if (isValid && data.content !== content) {
      onSaveContent(data.content);
    }
    onChangeEditable(id);
    removeItemFromSessionStorage(draftStorageKey);
  }, [content, id, onChangeEditable, onSaveContent, submit, draftStorageKey]);

  return (
    <Form form={form} data-test-subj="editable-markdown-form">
      <UseField
        path={fieldName}
        component={MarkdownEditorForm}
        componentProps={{
          ref: editorRef,
          'aria-label': 'Cases markdown editor',
          value: content,
          id,
          draftStorageKey,
          bottomRightContent: (
            <EditableMarkdownFooter
              handleSaveAction={handleSaveAction}
              handleCancelAction={handleCancelAction}
            />
          ),
          initialValue: content,
        }}
      />
    </Form>
  );
};

EditableMarkDownRenderer.displayName = 'EditableMarkDownRenderer';

export const EditableMarkdown = React.memo(EditableMarkDownRenderer);
