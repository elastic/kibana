/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';

import { GlobalFlyout } from '../../shared_imports';
import { useMappingsState, useDispatch } from '../../mappings_state_context';
import { deNormalize } from '../../lib';
import { EditFieldContainer, EditFieldContainerProps, defaultFlyoutProps } from './fields';
import { DocumentFieldsJsonEditor } from './fields_json_editor';
import { DocumentFieldsTreeEditor } from './fields_tree_editor';

const { useGlobalFlyout } = GlobalFlyout;
interface Props {
  searchComponent?: React.ReactElement;
  searchResultComponent?: React.ReactElement;
  onCancelAddingNewFields?: () => void;
  isAddingFields?: boolean;
  isSemanticTextEnabled?: boolean;
}
export const DocumentFields = React.memo(
  ({
    searchComponent,
    searchResultComponent,
    onCancelAddingNewFields,
    isAddingFields,
    isSemanticTextEnabled,
  }: Props) => {
    const { fields, documentFields } = useMappingsState();
    const dispatch = useDispatch();
    const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
      useGlobalFlyout();

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
        <DocumentFieldsTreeEditor
          onCancelAddingNewFields={onCancelAddingNewFields}
          isAddingFields={isAddingFields}
          isSemanticTextEnabled={isSemanticTextEnabled}
        />
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

    return (
      <div data-test-subj="documentFields">
        {searchComponent}
        {searchResultComponent ? searchResultComponent : editor}
      </div>
    );
  }
);
