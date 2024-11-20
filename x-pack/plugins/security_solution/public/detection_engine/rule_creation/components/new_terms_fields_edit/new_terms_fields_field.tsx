/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import type { DataViewFieldBase } from '@kbn/es-query';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { FieldHook } from '../../../../shared_imports';
import { PLACEHOLDER } from './translations';

interface NewTermsFieldsProps {
  fieldNames: DataViewFieldBase[];
  field: FieldHook;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'newTermsFieldEdit';

export const NewTermsFieldsField = memo(function NewTermsFieldsField({
  fieldNames,
  field,
}: NewTermsFieldsProps): JSX.Element {
  const fieldEuiFieldProps = {
    fullWidth: true,
    noSuggestions: false,
    options: fieldNames.map((name) => ({ label: name })),
    placeholder: PLACEHOLDER,
    onCreateOption: undefined,
    style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
  };

  return (
    <ComboBoxField field={field} idAria={fieldDescribedByIds} euiFieldProps={fieldEuiFieldProps} />
  );
});
