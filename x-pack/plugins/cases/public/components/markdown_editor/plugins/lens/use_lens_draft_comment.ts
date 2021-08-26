/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiMarkdownAstNodePosition } from '@elastic/eui';
import { useCallback, useEffect, useState } from 'react';
import { first } from 'rxjs/operators';
import { useKibana } from '../../../../common/lib/kibana';
import { DRAFT_COMMENT_STORAGE_ID } from './constants';
import { INSERT_LENS } from './translations';

interface DraftComment {
  commentId: string;
  comment: string;
  position: EuiMarkdownAstNodePosition;
  title: string;
}

export const useLensDraftComment = () => {
  const {
    application: { currentAppId$ },
    embeddable,
    storage,
  } = useKibana().services;
  const [draftComment, setDraftComment] = useState<DraftComment | null>(null);

  useEffect(() => {
    const fetchDraftComment = async () => {
      const currentAppId = await currentAppId$.pipe(first()).toPromise();

      if (!currentAppId) {
        return;
      }

      const incomingEmbeddablePackage = embeddable
        ?.getStateTransfer()
        .getIncomingEmbeddablePackage(currentAppId);

      if (incomingEmbeddablePackage) {
        if (storage.get(DRAFT_COMMENT_STORAGE_ID)) {
          try {
            setDraftComment(storage.get(DRAFT_COMMENT_STORAGE_ID));
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }
      }
    };
    fetchDraftComment();
  }, [currentAppId$, embeddable, storage]);

  const openLensModal = useCallback(({ editorRef }) => {
    if (editorRef && editorRef.textarea && editorRef.toolbar) {
      const lensPluginButton = editorRef.toolbar?.querySelector(`[aria-label="${INSERT_LENS}"]`);
      if (lensPluginButton) {
        lensPluginButton.click();
      }
    }
  }, []);

  const clearDraftComment = useCallback(() => {
    storage.remove(DRAFT_COMMENT_STORAGE_ID);
  }, [storage]);

  return { draftComment, openLensModal, clearDraftComment };
};
