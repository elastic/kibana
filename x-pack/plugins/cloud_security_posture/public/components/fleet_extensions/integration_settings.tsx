/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PosturePolicyTemplate } from '../../../common/types';

interface IntegrationSettingsInfoProps {
  type: PosturePolicyTemplate;
  showStepTitle: boolean;
}

export const IntegrationSettingsInfo = ({ type, showStepTitle }: IntegrationSettingsInfoProps) => (
  <div>
    {/* We need to add the step title in integration edit screen */}
    {showStepTitle && (
      <>
        <EuiSpacer />
        <EuiText>
          <h4>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.integrationSettingsTitle"
              defaultMessage="Integration Settings"
            />
          </h4>
        </EuiText>
        <EuiSpacer />
      </>
    )}
    <EuiText color={'subdued'} size="s">
      {type === 'kspm' && (
        <FormattedMessage
          id="xpack.csp.fleetIntegration.configureKspmIntegrationDescription"
          defaultMessage="Select the Kuberentes cluster type you want to monitor and then fill in the name and description to help identify this integration"
        />
      )}
      {type === 'cspm' && (
        <FormattedMessage
          id="xpack.csp.fleetIntegration.configureCspmIntegrationDescription"
          defaultMessage="Select the cloud service provider (CSP) you want to monitor and then fill in the name and description to help identify this integration"
        />
      )}
    </EuiText>
    <EuiSpacer />
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
    <EuiSpacer />
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
