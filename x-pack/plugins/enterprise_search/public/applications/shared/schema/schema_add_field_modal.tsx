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

import { CANCEL_BUTTON_LABEL } from '../constants';

import {
  FIELD_NAME_CORRECT_NOTE,
  FIELD_NAME_CORRECTED_PREFIX,
  FIELD_NAME_MODAL_TITLE,
  FIELD_NAME_MODAL_DESCRIPTION,
  FIELD_NAME_MODAL_ADD_FIELD,
} from './constants';
import { SchemaType } from './types';

import { SchemaFieldTypeSelect } from './';

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
    rawFieldName !== formattedFieldName ? (
      <>
        {FIELD_NAME_CORRECTED_PREFIX} <strong>{formattedFieldName}</strong>
      </>
    ) : (
      FIELD_NAME_CORRECT_NOTE
    );

  return (
    <EuiModal onClose={closeAddFieldModal} maxWidth={500}>
      <form onSubmit={submitForm}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{FIELD_NAME_MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <p>{FIELD_NAME_MODAL_DESCRIPTION}</p>
          <EuiForm>
            <EuiSpacer />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiFormRow
                  label="Field name"
                  helpText={fieldNameNote}
                  fullWidth
                  data-test-subj="SchemaAddFieldNameRow"
                  error={addFieldFormErrors}
                  isInvalid={!!addFieldFormErrors}
                >
                  <EuiFieldText
                    placeholder="name"
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
                <EuiFormRow label="Field type" data-test-subj="SchemaAddFieldTypeRow">
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
            isLoading={loading}
            data-test-subj="SchemaAddFieldAddFieldButton"
          >
            {FIELD_NAME_MODAL_ADD_FIELD}
          </EuiButton>
        </EuiModalFooter>
      </form>
    </EuiModal>
  );
};

const formatFieldName = (rawName: string) =>
  rawName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9]+$/, '')
    .toLowerCase();
