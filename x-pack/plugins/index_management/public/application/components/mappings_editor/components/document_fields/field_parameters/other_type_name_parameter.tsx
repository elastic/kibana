/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';

import { getFieldConfig } from '../../../lib';
import { UseField, TextField } from '../../../shared_imports';

export const OtherTypeNameParameter = () => (
  <UseField path="otherTypeName" config={getFieldConfig('otherTypeName')}>
    {otherTypeNameField => {
      const error = otherTypeNameField.getErrorsMessages();
      const isInvalid = error ? Boolean(error.length) : false;

      return (
        <EuiFormRow error={error} isInvalid={isInvalid}>
          <TextField field={otherTypeNameField} />
        </EuiFormRow>
      );
    }}
  </UseField>
);
