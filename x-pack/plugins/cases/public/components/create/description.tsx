/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { MarkdownEditorForm } from '../markdown_editor';
import { UseField, useFormContext, useFormData } from '../../common/shared_imports';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import { ID as LensPluginId } from '../markdown_editor/plugins/lens/constants';

interface Props {
  isLoading: boolean;
}

export const fieldName = 'description';

const DescriptionComponent: React.FC<Props> = ({ isLoading }) => {
  const { draftComment, hasIncomingLensState, openLensModal, clearDraftComment } =
    useLensDraftComment();
  const { setFieldValue } = useFormContext();
  const [{ title, tags }] = useFormData({ watch: ['title', 'tags'] });
  const editorRef = useRef<Record<string, unknown>>();
  const disabledUiPlugins = [LensPluginId];

  useEffect(() => {
    if (draftComment?.commentId === fieldName && editorRef.current) {
      setFieldValue(fieldName, draftComment.comment);

      if (draftComment.caseTitle) {
        setFieldValue('title', draftComment.caseTitle);
      }

      if (draftComment.caseTags && draftComment.caseTags.length > 0) {
        setFieldValue('tags', draftComment.caseTags);
      }

      if (hasIncomingLensState) {
        openLensModal({ editorRef: editorRef.current });
      } else {
        clearDraftComment();
      }
    }
  }, [clearDraftComment, draftComment, hasIncomingLensState, openLensModal, setFieldValue]);

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
        caseTitle: title,
        caseTags: tags,
        disabledUiPlugins,
      }}
    />
  );
};

DescriptionComponent.displayName = 'DescriptionComponent';

export const Description = memo(DescriptionComponent);
