/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { MarkdownEditorForm } from '../markdown_editor';
import { UseField, useFormContext } from '../../common/shared_imports';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';

interface Props {
  isLoading: boolean;
}

export const fieldName = 'description';

const DescriptionComponent: React.FC<Props> = ({ isLoading }) => {
  const { draftComment, openLensModal } = useLensDraftComment();
  const { setFieldValue } = useFormContext();
  const editorRef = useRef<Record<string, any>>();

  useEffect(() => {
    if (draftComment?.commentId === fieldName && editorRef.current) {
      setFieldValue(fieldName, draftComment.comment);
      openLensModal({ editorRef: editorRef.current });
    }
  }, [draftComment, openLensModal, setFieldValue]);

  return (
    <UseField
      path={fieldName}
      component={MarkdownEditorForm}
      componentProps={{
        id: fieldName,
        ref: editorRef,
        dataTestSubj: 'caseDescription',
        idAria: 'caseDescription',
        isDisabled: isLoading,
      }}
    />
  );
};

DescriptionComponent.displayName = 'DescriptionComponent';

export const Description = memo(DescriptionComponent);
