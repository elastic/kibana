/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';

import { getFieldConfig } from '../../../lib';
import { UseField, JsonEditorField } from '../../../shared_imports';

export const CustomTypeJsonParameter = () => (
  <UseField path="customTypeJson" config={getFieldConfig('customTypeJson')}>
    {customTypeJsonField => {
      const error = customTypeJsonField.getErrorsMessages();
      const isInvalid = error ? Boolean(error.length) : false;

      return (
        <EuiFormRow isInvalid={isInvalid}>
          <JsonEditorField field={customTypeJsonField} />
        </EuiFormRow>
      );
    }}
  </UseField>
);
