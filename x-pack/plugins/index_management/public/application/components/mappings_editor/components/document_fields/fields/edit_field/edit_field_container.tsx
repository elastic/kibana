/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useCallback, useMemo } from 'react';

import { useForm, GlobalFlyout } from '../../../../shared_imports';
import { useDispatch, useMappingsState } from '../../../../mappings_state_context';
import { Field } from '../../../../types';
import { fieldSerializer, fieldDeserializer } from '../../../../lib';
import { ModalConfirmationDeleteFields } from '../modal_confirmation_delete_fields';
import { EditField, defaultFlyoutProps, Props as EditFieldProps } from './edit_field';
import { useUpdateField } from './use_update_field';

const { useGlobalFlyout } = GlobalFlyout;

export const EditFieldContainer = React.memo(() => {
  const { fields, documentFields } = useMappingsState();
  const dispatch = useDispatch();
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();
  const { updateField, modal } = useUpdateField();

  const { status, fieldToEdit } = documentFields;
  const isEditing = status === 'editingField';

  const field = isEditing ? fields.byId[fieldToEdit!] : undefined;

  const formDefaultValue = useMemo(() => {
    return { ...field?.source };
  }, [field?.source]);

  const { form } = useForm<Field>({
    defaultValue: formDefaultValue,
    serializer: fieldSerializer,
    deserializer: fieldDeserializer,
    options: { stripEmptyFields: false },
  });

  const { subscribe } = form;

  useEffect(() => {
    const subscription = subscribe((updatedFieldForm) => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [subscribe, dispatch]);

  const exitEdit = useCallback(() => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  }, [dispatch]);

  useEffect(() => {
    if (isEditing) {
      // Open the flyout with the <EditField /> content
      addContentToGlobalFlyout<EditFieldProps>({
        id: 'mappingsEditField',
        Component: EditField,
        props: {
          form,
          field: field!,
          exitEdit,
          allFields: fields.byId,
          updateField,
        },
        flyoutProps: { ...defaultFlyoutProps, onClose: exitEdit },
        cleanUpFunc: exitEdit,
      });
    }
  }, [
    isEditing,
    field,
    form,
    addContentToGlobalFlyout,
    fields.byId,
    fieldToEdit,
    exitEdit,
    updateField,
  ]);

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

  return modal.isOpen ? <ModalConfirmationDeleteFields {...modal.props} /> : null;
});
