/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useMappingsState, useDispatch } from '../../mappings_state_context';
import {
  documentationService,
  GlobalFlyout,
  RuntimeField,
  RuntimeFieldEditorFlyoutContent,
  RuntimeFieldEditorFlyoutContentProps,
} from '../../shared_imports';
import { EmptyPrompt } from './empty_prompt';

const { useGlobalFlyout } = GlobalFlyout;

export const RuntimeFieldsList = () => {
  const runtimeFieldsDocsUri = documentationService.getRuntimeFields();
  const {
    runtimeFieldsList: { status },
  } = useMappingsState();
  const dispatch = useDispatch();
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const createField = useCallback(() => {
    dispatch({ type: 'runtimeFieldsList.createField' });
  }, [dispatch]);

  const exitEdit = useCallback(() => {
    dispatch({ type: 'runtimeFieldsList.closeRuntimeFieldEditor' });
  }, [dispatch]);

  const saveRuntimeField = useCallback(
    (field: RuntimeField) => {
      dispatch({ type: 'runtimeField.add', value: field });
    },
    [dispatch]
  );

  useEffect(() => {
    if (status === 'creatingField' || status === 'editingField') {
      addContentToGlobalFlyout<RuntimeFieldEditorFlyoutContentProps>({
        id: 'runtimeFieldEditor',
        Component: RuntimeFieldEditorFlyoutContent,
        props: {
          onSave: saveRuntimeField,
          onCancel: exitEdit,
          docLinks: {
            DOC_LINK_VERSION: 'master',
            ELASTIC_WEBSITE_URL: 'https://elastic.co',
            links: {} as any,
          },
        },
        flyoutProps: {
          'data-test-subj': 'runtimeFieldEditor',
          'aria-labelledby': 'runtimeFieldEditorEditTitle',
          maxWidth: 720,
          onClose: exitEdit,
        },
        cleanUpFunc: exitEdit,
      });
    } else if (status === 'idle') {
      removeContentFromGlobalFlyout('runtimeFieldEditor');
    }
  }, [status, addContentToGlobalFlyout, removeContentFromGlobalFlyout, saveRuntimeField, exitEdit]);

  return <EmptyPrompt createField={createField} runtimeFieldsDocsUri={runtimeFieldsDocsUri} />;
};
