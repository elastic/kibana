/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useRef } from 'react';

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
  const fieldName = 'content';

  return isEditable ? (
    <EditableMarkdown
      id={id}
      content={content}
      caseId={caseId}
      editorRef={editorRef}
      onChangeEditable={onChangeEditable}
      onSaveContent={onSaveContent}
      ref={ref}
      fieldName={fieldName}
      formSchema={schema}
    />
  ) : (
    <ScrollableMarkdown content={content} />
  );
});

UserActionMarkdownComponent.displayName = 'UserActionMarkdownComponent';

export const UserActionMarkdown = React.memo(UserActionMarkdownComponent);
