/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

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
  EuiOverlayMask,
  EuiSelect,
} from '@elastic/eui';

import { DisplaySettingsLogic } from './DisplaySettingsLogic';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      updateDetailField({ fieldName, label }, editFieldIndex);
    } else {
      addDetailField({ fieldName, label });
    }
  };

  const ACTION_LABEL = isEditing ? 'Update' : 'Add';

  return (
    <EuiOverlayMask>
      <form onSubmit={handleSubmit}>
        <EuiModal onClose={toggleFieldEditorModal} maxWidth={475}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{ACTION_LABEL} Field</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm>
              <EuiFormRow label="Field">
                <EuiSelect
                  options={isEditing ? fieldOptions : availableFieldOptions}
                  name="field"
                  required={true}
                  className="field-selector"
                  hasNoInitialSelection={true}
                  data-test-subj="AvailableFieldOptions"
                  value={fieldName}
                  disabled={!!isEditing}
                  onChange={(e) => setName(e.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow label="Label">
                <EuiFieldText
                  name="label"
                  required={true}
                  data-test-subj="VisibleFieldName"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={toggleFieldEditorModal}>Cancel</EuiButtonEmpty>
            <EuiButton data-test-subj="FieldSubmitButton" color="primary" fill={true} type="submit">
              {ACTION_LABEL} Field
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </form>
    </EuiOverlayMask>
  );
};
