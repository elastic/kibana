/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IntegrationConfigurationFormProps } from '@kbn/wci-browser';
import { EuiDescribedFormGroup, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { Controller } from 'react-hook-form';

export const SalesforceConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control } = form;

  return (
    <EuiDescribedFormGroup
      ratio="third"
      title={<h3>Salesforce Configuration</h3>}
      description="Configure the salesforce details"
    >
      <EuiFormRow label="Index">
        <Controller
          name="configuration.index"
          control={control}
          render={({ field }) => (
            <EuiFieldText
              data-test-subj="workchatAppIntegrationEditViewIndex"
              placeholder="Enter index name"
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
