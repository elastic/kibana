/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
import { NEW_TERMS_FIELD_PLACEHOLDER } from './translations';

interface NewTermsFieldsProps {
  fieldNames: DataViewFieldBase[];
  field: FieldHook;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'newTermsFieldEdit';

const NewTermsFieldsEditFieldComponent: React.FC<NewTermsFieldsProps> = ({
  fieldNames,
  field,
}: NewTermsFieldsProps) => {
  const fieldEuiFieldProps = {
    fullWidth: true,
    noSuggestions: false,
    options: fieldNames.map((name) => ({ label: name })),
    placeholder: NEW_TERMS_FIELD_PLACEHOLDER,
    onCreateOption: undefined,
    style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
  };

  return <Field field={field} idAria={fieldDescribedByIds} euiFieldProps={fieldEuiFieldProps} />;
};

export const NewTermsFieldsField = React.memo(NewTermsFieldsEditFieldComponent);
