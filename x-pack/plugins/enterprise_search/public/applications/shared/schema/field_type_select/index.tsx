/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSelect } from '@elastic/eui';

import { SchemaType } from '../types';

interface Props {
  fieldName: string;
  fieldType: string;
  updateExistingFieldType(fieldName: string, fieldType: string): void;
  disabled?: boolean;
}

export const SchemaFieldTypeSelect: React.FC<Props> = ({
  fieldName,
  fieldType,
  updateExistingFieldType,
  disabled,
}) => {
  const fieldTypeOptions = Object.values(SchemaType).map((type) => ({ value: type, text: type }));
  return (
    <EuiSelect
      name={fieldName}
      required
      value={fieldType}
      options={fieldTypeOptions}
      disabled={disabled}
      onChange={(e) => updateExistingFieldType(fieldName, e.target.value)}
      data-test-subj="SchemaSelect"
    />
  );
};
