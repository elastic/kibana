/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { GlobalFlyout } from '../../shared_imports';
import { useMappingsState, useDispatch } from '../../mappings_state_context';
import { deNormalize } from '../../lib';
import { EditFieldContainer, EditFieldContainerProps, defaultFlyoutProps } from './fields';
import { DocumentFieldsHeader } from './document_fields_header';
import { DocumentFieldsJsonEditor } from './fields_json_editor';
import { DocumentFieldsTreeEditor } from './fields_tree_editor';
import { SearchResult } from './search_fields';

const { useGlobalFlyout } = GlobalFlyout;

export const DocumentFields = React.memo(() => {
  const { fields, search, documentFields } = useMappingsState();
  const dispatch = useDispatch();
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const { editor: editorType } = documentFields;
  const isEditing = documentFields.status === 'editingField';

  const jsonEditorDefaultValue = useMemo(() => {
    if (editorType === 'json') {
      return deNormalize(fields);
    }
  }, [editorType, fields]);

  const editor =
    editorType === 'json' ? (
      <DocumentFieldsJsonEditor defaultValue={jsonEditorDefaultValue!} />
    ) : (
      <DocumentFieldsTreeEditor />
    );

  const onSearchChange = useCallback(
    (value: string) => {
      dispatch({ type: 'search:update', value });
    },
    [dispatch]
  );

  const exitEdit = useCallback(() => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  }, [dispatch]);

  useEffect(() => {
    if (isEditing) {
      // Open the flyout with the <EditField /> content
      addContentToGlobalFlyout<EditFieldContainerProps>({
        id: 'mappingsEditField',
        Component: EditFieldContainer,
        props: { exitEdit },
        flyoutProps: { ...defaultFlyoutProps, onClose: exitEdit },
        cleanUpFunc: exitEdit,
      });
    }
  }, [isEditing, addContentToGlobalFlyout, fields.byId, exitEdit]);

  useEffect(() => {
    if (!isEditing) {
      removeContentFromGlobalFlyout('mappingsEditField');
    }
  }, [isEditing, removeContentFromGlobalFlyout]);

  useEffect(() => {
    return () => {
      if (isEditing) {
        // When the component unmounts, exit edit mode.
        exitEdit();
      }
    };
  }, [isEditing, exitEdit]);

  const searchTerm = search.term.trim();

  return (
    <div data-test-subj="documentFields">
      <DocumentFieldsHeader searchValue={search.term} onSearchChange={onSearchChange} />
      <EuiSpacer size="m" />
      {searchTerm !== '' ? (
        <SearchResult result={search.result} documentFieldsState={documentFields} />
      ) : (
        editor
      )}
    </div>
  );
});
