/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { UseField, TextField, FieldConfig } from '../../../shared_imports';
import { fieldValidators } from '../../../shared_imports';

const { emptyField } = fieldValidators;

/**
 * This is a special component that does not have an explicit entry in {@link PARAMETERS_DEFINITION}.
 *
 * We use it to store the name of types unknown to the mappings editor in the "subType" path.
 */

const fieldConfig: FieldConfig = {
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.otherTypeNameFieldLabel', {
    defaultMessage: 'Type Name',
  }),
  defaultValue: '',
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.idxMgmt.mappingsEditor.parameters.validations.otherTypeNameIsRequiredErrorMessage',
          {
            defaultMessage: 'The type name is required.',
          }
        )
      ),
    },
  ],
};

export const OtherTypeNameParameter = () => (
  <UseField path="subType" config={fieldConfig} component={TextField} />
);
