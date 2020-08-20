/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useMemo } from 'react';

import { useForm } from '../../../../shared_imports';
import { useDispatch, useMappingsState } from '../../../../mappings_state_context';
import { Field } from '../../../../types';
import { fieldSerializer, fieldDeserializer } from '../../../../lib';
import { ModalConfirmationDeleteFields } from '../modal_confirmation_delete_fields';
import { EditField } from './edit_field';
import { useUpdateField } from './use_update_field';

export const defaultFlyoutProps = {
  'data-test-subj': 'mappingsEditorFieldEdit',
  'aria-labelledby': 'mappingsEditorFieldEditTitle',
  className: 'mappingsEditor__editField',
  maxWidth: 720,
};

export interface Props {
  exitEdit: () => void;
}

export const EditFieldContainer = React.memo(({ exitEdit }: Props) => {
  const { fields, documentFields } = useMappingsState();
  const dispatch = useDispatch();
  const { updateField, modal } = useUpdateField();

  const { status, fieldToEdit } = documentFields;
  const isEditing = status === 'editingField';
  const field = fields.byId[fieldToEdit!];

  const formDefaultValue = useMemo(() => {
    return { ...field?.source };
  }, [field?.source]);

  const { form } = useForm<Field>({
    defaultValue: formDefaultValue,
    serializer: fieldSerializer,
    deserializer: fieldDeserializer,
    options: { stripEmptyFields: false },
    id: 'edit-field',
  });

  const { subscribe } = form;

  useEffect(() => {
    const subscription = subscribe((updatedFieldForm) => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [subscribe, dispatch]);

  const renderModal = () => {
    return modal.isOpen ? <ModalConfirmationDeleteFields {...modal.props} /> : null;
  };

  if (!isEditing) {
    return null;
  }

  return (
    <>
      <EditField
        form={form}
        field={field}
        allFields={fields.byId}
        exitEdit={exitEdit}
        updateField={updateField}
      />
      {renderModal()}
    </>
  );
});
