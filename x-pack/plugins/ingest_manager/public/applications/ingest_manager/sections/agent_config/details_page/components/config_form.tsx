/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../types';

interface ValidationResults {
  [key: string]: JSX.Element[];
}

export const configFormValidation = (config: Partial<AgentConfig>): ValidationResults => {
  const errors: ValidationResults = {};

  if (!config.name?.trim()) {
    errors.name = [
      <FormattedMessage
        id="xpack.ingestManager.configForm.nameRequiredErrorMessage"
        defaultMessage="Config name is required"
      />,
    ];
  }

  return errors;
};

interface Props {
  config: Partial<AgentConfig>;
  updateConfig: (u: Partial<AgentConfig>) => void;
  validation: ValidationResults;
}

export const ConfigForm: React.FunctionComponent<Props> = ({
  config,
  updateConfig,
  validation,
}) => {
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
  const fields: Array<{ name: 'name' | 'description' | 'namespace'; label: JSX.Element }> = [
    {
      name: 'name',
      label: (
        <FormattedMessage
          id="xpack.ingestManager.configForm.nameFieldLabel"
          defaultMessage="Name"
        />
      ),
    },
    {
      name: 'description',
      label: (
        <FormattedMessage
          id="xpack.ingestManager.configForm.descriptionFieldLabel"
          defaultMessage="Description"
        />
      ),
    },
    {
      name: 'namespace',
      label: (
        <FormattedMessage
          id="xpack.ingestManager.configForm.namespaceFieldLabel"
          defaultMessage="Namespace"
        />
      ),
    },
  ];

  return (
    <EuiForm>
      {fields.map(({ name, label }) => {
        return (
          <EuiFormRow
            key={name}
            label={label}
            error={touchedFields[name] && validation[name] ? validation[name] : null}
            isInvalid={Boolean(touchedFields[name] && validation[name])}
          >
            <EuiFieldText
              value={config[name]}
              onChange={e => updateConfig({ [name]: e.target.value })}
              isInvalid={Boolean(touchedFields[name] && validation[name])}
              onBlur={() => setTouchedFields({ ...touchedFields, [name]: true })}
            />
          </EuiFormRow>
        );
      })}
    </EuiForm>
  );
};
