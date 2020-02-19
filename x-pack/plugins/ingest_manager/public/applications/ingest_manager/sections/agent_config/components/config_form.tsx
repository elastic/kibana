/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { NewAgentConfig } from '../../../types';

interface ValidationResults {
  [key: string]: JSX.Element[];
}

export const agentConfigFormValidation = (
  agentConfig: Partial<NewAgentConfig>
): ValidationResults => {
  const errors: ValidationResults = {};

  if (!agentConfig.name?.trim()) {
    errors.name = [
      <FormattedMessage
        id="xpack.ingestManager.agentConfigForm.nameRequiredErrorMessage"
        defaultMessage="Agent config name is required"
      />,
    ];
  }

  return errors;
};

interface Props {
  agentConfig: Partial<NewAgentConfig>;
  updateAgentConfig: (u: Partial<NewAgentConfig>) => void;
  validation: ValidationResults;
}

export const AgentConfigForm: React.FunctionComponent<Props> = ({
  agentConfig,
  updateAgentConfig,
  validation,
}) => {
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
  const fields: Array<{ name: 'name' | 'description' | 'namespace'; label: JSX.Element }> = [
    {
      name: 'name',
      label: (
        <FormattedMessage
          id="xpack.ingestManager.agentConfigForm.nameFieldLabel"
          defaultMessage="Name"
        />
      ),
    },
    {
      name: 'description',
      label: (
        <FormattedMessage
          id="xpack.ingestManager.agentConfigForm.descriptionFieldLabel"
          defaultMessage="Description"
        />
      ),
    },
    {
      name: 'namespace',
      label: (
        <FormattedMessage
          id="xpack.ingestManager.agentConfigForm.namespaceFieldLabel"
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
              value={agentConfig[name]}
              onChange={e => updateAgentConfig({ [name]: e.target.value })}
              isInvalid={Boolean(touchedFields[name] && validation[name])}
              onBlur={() => setTouchedFields({ ...touchedFields, [name]: true })}
            />
          </EuiFormRow>
        );
      })}
    </EuiForm>
  );
};
