/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
} from '@elastic/eui';

import { CANCEL_BUTTON, FIELD_LABEL, UPDATE_LABEL, ADD_LABEL } from '../../../../constants';

import { DisplaySettingsLogic } from './display_settings_logic';

const emptyField = { fieldName: '', label: '' };

export const FieldEditorModal: React.FC = () => {
  const { toggleFieldEditorModal, addDetailField, updateDetailField } = useActions(
    DisplaySettingsLogic
  );

  const {
    searchResultConfig: { detailFields },
    availableFieldOptions,
    fieldOptions,
    editFieldIndex,
  } = useValues(DisplaySettingsLogic);

  const isEditing = editFieldIndex || editFieldIndex === 0;
  const field = isEditing ? detailFields[editFieldIndex || 0] : emptyField;
  const [fieldName, setName] = useState(field.fieldName || '');
  const [label, setLabel] = useState(field.label || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateDetailField({ fieldName, label }, editFieldIndex);
    } else {
      addDetailField({ fieldName, label });
    }
  };

  const ACTION_LABEL = isEditing ? UPDATE_LABEL : ADD_LABEL;

  return (
    <EuiModal onClose={toggleFieldEditorModal} maxWidth={475}>
      <form onSubmit={handleSubmit}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {ACTION_LABEL} {FIELD_LABEL}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiForm>
            <EuiFormRow label="Field">
              <EuiSelect
                options={isEditing ? fieldOptions : availableFieldOptions}
                name="field"
                required
                className="field-selector"
                hasNoInitialSelection
                data-test-subj="AvailableFieldOptions"
                value={fieldName}
                disabled={!!isEditing}
                onChange={(e) => setName(e.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label="Label">
              <EuiFieldText
                name="label"
                required
                data-test-subj="VisibleFieldName"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={toggleFieldEditorModal}>{CANCEL_BUTTON}</EuiButtonEmpty>
          <EuiButton data-test-subj="FieldSubmitButton" color="primary" fill type="submit">
            {ACTION_LABEL} {FIELD_LABEL}
          </EuiButton>
        </EuiModalFooter>
      </form>
    </EuiModal>
  );
};
