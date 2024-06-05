/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiToolTip } from '@elastic/eui';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
// import { FIELD_PLACEHOLDER } from './translations';

interface MultiSelectAutocompleteProps {
  field: FieldHook;
  dataTestSubj?: string;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineMultiSelectAutocompleteField';

const dataTiersOptions = ['data_hot', 'data_warm', 'data_cold', 'data_frozen'].map((label) => ({
  label,
}));

export const DataTiersSelectorComponent: React.FC<MultiSelectAutocompleteProps> = ({
  field,
  dataTestSubj,
}: MultiSelectAutocompleteProps) => {
  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options: dataTiersOptions,
      onCreateOption: undefined,
    }),
    []
  );

  return (
    <Field
      field={field}
      idAria={fieldDescribedByIds}
      euiFieldProps={fieldEuiFieldProps}
      data-test-subj={dataTestSubj}
    />
  );
};

export const DataTiersSelector = React.memo(DataTiersSelectorComponent);
