/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';

import { CANCEL_BUTTON_LABEL } from '../../constants';
import { FIELD_NAME, FIELD_TYPE } from '../constants';
import { SchemaFieldTypeSelect } from '../index';
import { SchemaType } from '../types';

import {
  ADD_FIELD_MODAL_TITLE,
  ADD_FIELD_MODAL_DESCRIPTION,
  ADD_FIELD_BUTTON,
  FORM_ID,
  FIELD_NAME_PLACEHOLDER,
  FIELD_NAME_CORRECT_NOTE,
  FIELD_NAME_CORRECTED_NOTE,
} from './constants';
import { formatFieldName } from './utils';

interface ISchemaAddFieldModalProps {
  disableForm?: boolean;
  addFieldFormErrors?: string[] | null;
  addNewField(fieldName: string, newFieldType: string): void;
  closeAddFieldModal(): void;
}

export const SchemaAddFieldModal: React.FC<ISchemaAddFieldModalProps> = ({
  addNewField,
  addFieldFormErrors,
  closeAddFieldModal,
  disableForm,
}) => {
  const [loading, setLoading] = useState(false);
  const [newFieldType, updateNewFieldType] = useState(SchemaType.Text);
  const [formattedFieldName, setFormattedFieldName] = useState('');
  const [rawFieldName, setRawFieldName] = useState('');

  useEffect(() => {
    if (addFieldFormErrors) setLoading(false);
  }, [addFieldFormErrors]);

  const handleChange = ({ currentTarget: { value } }: ChangeEvent<HTMLInputElement>) => {
    setRawFieldName(value);
    setFormattedFieldName(formatFieldName(value));
  };

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    addNewField(formattedFieldName, newFieldType);
    setLoading(true);
  };

  const fieldNameNote =
    rawFieldName !== formattedFieldName
      ? FIELD_NAME_CORRECTED_NOTE(formattedFieldName)
      : FIELD_NAME_CORRECT_NOTE;

  return (
    <EuiModal onClose={closeAddFieldModal} maxWidth={500}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{ADD_FIELD_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <p>{ADD_FIELD_MODAL_DESCRIPTION}</p>
        <EuiSpacer />
        <EuiForm component="form" id={FORM_ID} onSubmit={submitForm}>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                label={FIELD_NAME}
                helpText={fieldNameNote}
                fullWidth
                data-test-subj="SchemaAddFieldNameRow"
                error={addFieldFormErrors}
                isInvalid={!!addFieldFormErrors}
              >
                <EuiFieldText
                  placeholder={FIELD_NAME_PLACEHOLDER}
                  type="text"
                  onChange={handleChange}
                  required
                  value={rawFieldName}
                  fullWidth
                  autoFocus
                  isLoading={loading}
                  data-test-subj="SchemaAddFieldNameField"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label={FIELD_TYPE} data-test-subj="SchemaAddFieldTypeRow">
                <SchemaFieldTypeSelect
                  fieldName=""
                  fieldType={newFieldType}
                  updateExistingFieldType={(_, type: SchemaType) => updateNewFieldType(type)}
                  disabled={disableForm}
                  data-test-subj="SchemaSelect"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeAddFieldModal}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        <EuiButton
          color="primary"
          fill
          disabled={disableForm}
          type="submit"
          form={FORM_ID}
          isLoading={loading}
          data-test-subj="SchemaAddFieldAddFieldButton"
        >
          {ADD_FIELD_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
