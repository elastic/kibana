/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TextField, UseField, FieldConfig } from '../../../shared_imports';
import { validateUniqueName } from '../../../lib';
import { PARAMETERS_DEFINITION } from '../../../constants';
import { useMappingsState } from '../../../mappings_state';

export const NameParameter = () => {
  const {
    fields: { rootLevelFields, byId },
    documentFields: { fieldToAddFieldTo, fieldToEdit },
  } = useMappingsState();
  const { validations, ...rest } = PARAMETERS_DEFINITION.name.fieldConfig as FieldConfig;

  const initialName = fieldToEdit ? byId[fieldToEdit].source.name : undefined;
  const parentId = fieldToEdit ? byId[fieldToEdit].parentId : fieldToAddFieldTo;
  const uniqueNameValidator = validateUniqueName({ rootLevelFields, byId }, initialName, parentId);

  const nameConfig: FieldConfig = {
    ...rest,
    validations: [
      ...validations!,
      {
        validator: uniqueNameValidator,
      },
    ],
  };

  return (
    <UseField
      path="name"
      config={nameConfig}
      component={TextField}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': 'nameParameterInput',
        },
      }}
    />
  );
};
