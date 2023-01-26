/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface IntegrationInfoFieldsProps {
  validationResults: PackagePolicyReplaceDefineStepExtensionComponentProps['validationResults'];
  newPolicy: NewPackagePolicy;
  onChange(field: string, value: string): void;
}

export const DefineIntegrationFields = ({
  validationResults,
  newPolicy,
  onChange,
}: IntegrationInfoFieldsProps) => {
  const fields = useMemo(
    () => [
      {
        key: 'name',
        value: newPolicy.name,
        error: validationResults?.name ?? null,
        label: (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationNameLabel"
            defaultMessage="Name"
          />
        ),
      },
      {
        key: 'description',
        value: newPolicy.description || '',
        error: validationResults?.description ?? null,
        label: (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationDescriptionLabel"
            defaultMessage="Description"
          />
        ),
      },
    ],
    [newPolicy.name, newPolicy.description, validationResults?.name, validationResults?.description]
  );

  return (
    <>
      {fields.map(({ key, label, error, value }) => (
        <EuiFormRow key={key} id={key} fullWidth label={label} isInvalid={!!error} error={error}>
          <EuiFieldText
            isInvalid={!!error?.length}
            fullWidth
            value={value}
            onChange={(event) => onChange(key, event.target.value)}
          />
        </EuiFormRow>
      ))}
    </>
  );
};
