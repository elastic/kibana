/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EuiOverlayMask,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { TEXT, fieldTypeSelectOptions } from '../constants/field_types';

import {
  FIELD_NAME_CORRECT_NOTE,
  FIELD_NAME_CORRECTED_PREFIX,
  FIELD_NAME_MODAL_TITLE,
  FIELD_NAME_MODAL_DESCRIPTION,
  FIELD_NAME_MODAL_CANCEL,
  FIELD_NAME_MODAL_ADD_FIELD,
} from './constants';

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
  const [newFieldType, updateNewFieldType] = useState(TEXT);
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
    <EuiOverlayMask>
      <form onSubmit={submitForm}>
        <EuiModal onClose={closeAddFieldModal} maxWidth={500}>
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
                    fullWidth={true}
                    data-test-subj="SchemaAddFieldNameRow"
                    error={addFieldFormErrors}
                    isInvalid={!!addFieldFormErrors}
                  >
                    <EuiFieldText
                      placeholder="name"
                      type="text"
                      onChange={handleChange}
                      required={true}
                      value={rawFieldName}
                      fullWidth={true}
                      autoFocus={true}
                      isLoading={loading}
                      data-test-subj="SchemaAddFieldNameField"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Field type" data-test-subj="SchemaAddFieldTypeRow">
                    <EuiSelect
                      name="select-add"
                      required
                      value={newFieldType}
                      options={fieldTypeSelectOptions}
                      disabled={disableForm}
                      onChange={(e) => updateNewFieldType(e.target.value)}
                      data-test-subj="SchemaSelect"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeAddFieldModal}>{FIELD_NAME_MODAL_CANCEL}</EuiButtonEmpty>
            <EuiButton
              color="primary"
              fill={true}
              disabled={disableForm}
              type="submit"
              isLoading={loading}
              data-test-subj="SchemaAddFieldAddFieldButton"
            >
              {FIELD_NAME_MODAL_ADD_FIELD}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </form>
    </EuiOverlayMask>
  );
};

const formatFieldName = (rawName: string) =>
  rawName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9]+$/, '')
    .toLowerCase();
