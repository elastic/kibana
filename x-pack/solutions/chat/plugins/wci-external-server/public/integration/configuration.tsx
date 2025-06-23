/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller } from 'react-hook-form';
import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import type { IntegrationConfigurationFormProps } from '@kbn/wci-browser';

export const ExternalServerConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control } = form;

  return (
    <EuiDescribedFormGroup
      ratio="third"
      title={<h3>External Server Configuration</h3>}
      description="Configure the external server details"
    >
      <EuiFormRow label="URL" helpText="The URL of the external server">
        <Controller
          name="configuration.url"
          control={control}
          render={({ field }) => (
            <EuiFieldText
              data-test-subj="workchatExternalServerUrl"
              placeholder="https://example.com/api"
              {...field}
            />
          )}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label="Description" helpText="Description of the external server">
        <Controller
          name="configuration.description"
          control={control}
          render={({ field }) => (
            <EuiTextArea
              data-test-subj="workchatExternalServerDescription"
              placeholder="Describe the external server"
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
