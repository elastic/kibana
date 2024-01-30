/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldPassword, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { AwsOptions } from './get_aws_credentials_form_options';

export const AwsInputVarFields = ({
  fields,
  onChange,
}: {
  fields: Array<AwsOptions[keyof AwsOptions]['fields'][number] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
}) => (
  <div>
    {fields.map((field) => (
      <EuiFormRow key={field.id} label={field.label} fullWidth hasChildLabel={true} id={field.id}>
        <>
          {field.type === 'password' && (
            <EuiFieldPassword
              id={field.id}
              type="dual"
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
          {field.type === 'text' && (
            <EuiFieldText
              id={field.id}
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
        </>
      </EuiFormRow>
    ))}
  </div>
);
