/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface IntegrationInfoFieldsProps {
  name: string;
  description: string;
  onChange(field: string, value: string): void;
}

export const IntegrationSettings = ({
  name,
  description,
  onChange,
}: IntegrationInfoFieldsProps) => (
  <div>
    <Field
      value={name}
      id="name"
      onChange={(value) => onChange('name', value)}
      label={
        <FormattedMessage
          id="xpack.csp.fleetIntegration.integrationNameLabel"
          defaultMessage="Name"
        />
      }
      error={
        !name ? (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationNameLabelError"
            defaultMessage="Name is required"
          />
        ) : undefined
      }
    />
    <Field
      value={description}
      id="description"
      onChange={(value) => onChange('description', value)}
      label={
        <FormattedMessage
          id="xpack.csp.fleetIntegration.integrationDescriptionLabel"
          defaultMessage="Description"
        />
      }
    />
  </div>
);

interface FieldProps {
  error?: React.ReactNode;
  id: string;
  value: string;
  label: JSX.Element;
  onChange(value: string): void;
}

const Field = ({ id, value, label, error, onChange }: FieldProps) => (
  <EuiFormRow key={id} id={id} fullWidth label={label} isInvalid={!!error} error={error}>
    <EuiFieldText
      isInvalid={!!error}
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </EuiFormRow>
);
