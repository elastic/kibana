/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

import { TextField, UseField, FieldConfig } from '../../../shared_imports';
import { validateUniqueName } from '../../../lib';
import { PARAMETERS_DEFINITION } from '../../../constants';
import { useMappingsState } from '../../../mappings_state_context';

const { validations, ...rest } = PARAMETERS_DEFINITION.name.fieldConfig as FieldConfig;

export const NameParameter = () => {
  const {
    fields: { rootLevelFields, byId },
    documentFields: { fieldToAddFieldTo, fieldToEdit },
  } = useMappingsState();

  const initialName = fieldToEdit ? byId[fieldToEdit].source.name : undefined;
  const parentId = fieldToEdit ? byId[fieldToEdit].parentId : fieldToAddFieldTo;
  const uniqueNameValidator = useCallback(
    (arg: any) => {
      return validateUniqueName({ rootLevelFields, byId }, initialName, parentId)(arg);
    },
    [rootLevelFields, byId, initialName, parentId]
  );

  const nameConfig: FieldConfig = useMemo(
    () => ({
      ...rest,
      validations: [
        ...validations!,
        {
          validator: uniqueNameValidator,
        },
      ],
    }),
    [uniqueNameValidator]
  );

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
