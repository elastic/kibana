/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
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
  const fields: Array<{
    name: 'name' | 'description' | 'namespace';
    label: JSX.Element;
  }> = useMemo(() => {
    return [
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
  }, []);

  return (
    <EuiForm>
      {fields.map(({ name, label }) => {
        return (
          <EuiFormRow
            fullWidth
            key={name}
            label={label}
            error={touchedFields[name] && validation[name] ? validation[name] : null}
            isInvalid={Boolean(touchedFields[name] && validation[name])}
          >
            <EuiFieldText
              fullWidth
              value={agentConfig[name]}
              onChange={e => updateAgentConfig({ [name]: e.target.value })}
              isInvalid={Boolean(touchedFields[name] && validation[name])}
              onBlur={() => setTouchedFields({ ...touchedFields, [name]: true })}
            />
          </EuiFormRow>
        );
      })}
      <EuiHorizontalRule />
      <EuiSpacer size="xs" />
      <EuiAccordion
        id="advancedOptions"
        buttonContent={
          <FormattedMessage
            id="xpack.ingestManager.agentConfigForm.advancedOptionsToggleLabel"
            defaultMessage="Advanced options"
          />
        }
      >
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigForm.namespaceFieldLabel"
                  defaultMessage="Default namespace"
                />
              </h4>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ingestManager.agentConfigForm.namespaceFieldDescription"
                defaultMessage="Apply a default namespace to data sources that use this configuration. Data sources can specify their own namespaces."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSwitch
              showLabel={true}
              label={
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigForm.namespaceUseDefaultsFieldLabel"
                  defaultMessage="Use default namespace"
                />
              }
              checked={false}
              onChange={() => {}}
            />
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              error={touchedFields.namespace && validation.namespace ? validation.namespace : null}
              isInvalid={Boolean(touchedFields.namespace && validation.namespace)}
            >
              <EuiFieldText
                fullWidth
                value={agentConfig.namespace}
                isInvalid={Boolean(touchedFields.namespace && validation.namespace)}
                onBlur={() => setTouchedFields({ ...touchedFields, namespace: true })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiForm>
  );
};
