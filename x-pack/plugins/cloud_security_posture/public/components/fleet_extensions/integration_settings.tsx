/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../../common/constants';
import type { PosturePolicyTemplate } from '../../../common/types';

interface IntegrationSettingsInfoProps {
  postureType: PosturePolicyTemplate;
}

export const IntegrationSettingsInfo = ({ postureType }: IntegrationSettingsInfoProps) => (
  <div>
    <EuiText color={'subdued'} size="s">
      {postureType === KSPM_POLICY_TEMPLATE && (
        <FormattedMessage
          id="xpack.csp.fleetIntegration.configureKspmIntegrationDescription"
          defaultMessage="Select the Kubernetes cluster type you want to monitor and then fill in the name and description to help identify this integration"
        />
      )}
      {postureType === CSPM_POLICY_TEMPLATE && (
        <FormattedMessage
          id="xpack.csp.fleetIntegration.configureCspmIntegrationDescription"
          defaultMessage="Select the cloud service provider (CSP) you want to monitor and then fill in the name and description to help identify this integration"
        />
      )}
    </EuiText>
  </div>
);

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

const Field = ({
  id,
  value,
  label,
  error,
  onChange,
}: {
  error?: React.ReactNode;
  id: string;
  value: string;
  label: JSX.Element;
  onChange(value: string): void;
}) => (
  <EuiFormRow key={id} id={id} fullWidth label={label} isInvalid={!!error} error={error}>
    <EuiFieldText
      isInvalid={!!error}
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </EuiFormRow>
);
