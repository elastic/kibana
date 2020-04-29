/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState } from 'react';
import styled from 'styled-components';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../../types';
import { useCore } from '../../../../../hooks';
import { AgentConfigDeleteProvider } from '../../../components';

const CenteredFormGroup = styled(EuiDescribedFormGroup)`
  margin-right: auto;
  margin-left: auto;
`;

export const ConfigSettingsView = memo<{ config: AgentConfig }>(
  ({ config: originalAgentConfig }) => {
    const { notifications } = useCore();
    const [config, setConfig] = useState<Partial<AgentConfig>>({
      name: originalAgentConfig.name,
      description: originalAgentConfig.description,
      namespace: originalAgentConfig.namespace,
    });
    const updateConfig = (updatedFields: Partial<AgentConfig>) => {
      setConfig({
        ...config,
        ...updatedFields,
      });
    };
    const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const validation = configValidation(config);

    const fields: {
      [key: string]: { name: 'name' | 'description' | 'namespace'; label: JSX.Element };
    } = {
      name: {
        name: 'name',
        label: (
          <FormattedMessage
            id="xpack.ingestManager.configForm.nameFieldLabel"
            defaultMessage="Name"
          />
        ),
      },
      description: {
        name: 'description',
        label: (
          <FormattedMessage
            id="xpack.ingestManager.configForm.descriptionFieldLabel"
            defaultMessage="Description"
          />
        ),
      },
      namespace: {
        name: 'namespace',
        label: (
          <FormattedMessage
            id="xpack.ingestManager.configForm.namespaceFieldLabel"
            defaultMessage="Namespace"
          />
        ),
      },
    };

    const renderField = ({ name, label }: { name: string; label: JSX.Element }) => (
      <EuiFormRow
        key={name}
        label={label}
        error={touchedFields[name] && validation[name] ? validation[name] : null}
        isInvalid={Boolean(touchedFields[name] && validation[name])}
      >
        <EuiFieldText
          value={config[name] as string}
          onChange={e => updateConfig({ [name]: e.target.value })}
          isInvalid={Boolean(touchedFields[name] && validation[name])}
          onBlur={() => setTouchedFields({ ...touchedFields, [name]: true })}
        />
      </EuiFormRow>
    );

    const onDelete = () => {
      // redirect to list page
      // add toast
    };

    return (
      <EuiForm>
        <CenteredFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.configForm.generalSettingsGroupTitle"
                defaultMessage="General settings"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.ingestManager.configForm.generalSettingsGroupDescription"
              defaultMessage="Choose a name and description for your agent configuration."
            />
          }
        >
          <>
            {renderField(fields.name)}
            {renderField(fields.description)}
          </>
        </CenteredFormGroup>
        <CenteredFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.configForm.defaultNamespaceGroupTitle"
                defaultMessage="Default namespace"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.ingestManager.configForm.defaultNamespaceGroupDescription"
              defaultMessage="Apply a default namespace to data sources that use this configuration. Data sources can specify their own namespaces."
            />
          }
        >
          <>{renderField(fields.namespace)}</>
        </CenteredFormGroup>
        <CenteredFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.configForm.deleteConfigGroupTitle"
                defaultMessage="Delete configuration"
              />
            </h4>
          }
          description={
            <>
              <FormattedMessage
                id="xpack.ingestManager.configForm.deleteConfigGroupDescription"
                defaultMessage="Existing data will not be deleted."
              />
              <EuiSpacer size="s" />
              <AgentConfigDeleteProvider>
                {deleteAgentConfigPrompt => {
                  return (
                    <EuiButton
                      color="danger"
                      disabled={Boolean(originalAgentConfig.is_default)}
                      onClick={() => deleteAgentConfigPrompt(originalAgentConfig.id, onDelete)}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.configForm.deleteConfigActionText"
                        defaultMessage="Delete configuration"
                      />
                    </EuiButton>
                  );
                }}
              </AgentConfigDeleteProvider>
              {originalAgentConfig.is_default ? (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText color="subdued" size="xs">
                    <FormattedMessage
                      id="xpack.ingestManager.configForm.unableToDeleteDefaultConfigText"
                      defaultMessage="Default configuration cannot be deleted"
                    />
                  </EuiText>
                </>
              ) : null}
            </>
          }
        />
      </EuiForm>
    );
  }
);

interface ConfigValidationResults {
  [key: string]: JSX.Element[];
}

export const configValidation = (config: Partial<AgentConfig>): ConfigValidationResults => {
  const errors: ConfigValidationResults = {};

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
