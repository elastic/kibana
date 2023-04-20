/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import { useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Content } from './schema';
import { schema } from './schema';
import { ScrollableMarkdown, EditableMarkdown } from '../markdown_editor';

interface UserActionMarkdownProps {
  content: string;
  id: string;
  caseId: string;
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
>(({ id, content, caseId, isEditable, onChangeEditable, onSaveContent }, ref) => {
  const editorRef = useRef();
  const initialState = { content };
  const { form } = useForm<Content>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const fieldName = 'content';
  const { setFieldValue } = form;

  const setComment = useCallback(
    (newComment) => {
      setFieldValue(fieldName, newComment);
    },
    [setFieldValue]
  );

  useImperativeHandle(ref, () => ({
    setComment,
    editor: editorRef.current,
  }));
  return isEditable ? (
    <EditableMarkdown
      id={id}
      content={content}
      caseId={caseId}
      onChangeEditable={onChangeEditable}
      onSaveContent={onSaveContent}
      editorRef={editorRef}
      form={form}
      fieldName={fieldName}
    />
  ) : (
    <ScrollableMarkdown content={content} />
  );
});

UserActionMarkdownComponent.displayName = 'UserActionMarkdownComponent';

export const UserActionMarkdown = React.memo(UserActionMarkdownComponent);
