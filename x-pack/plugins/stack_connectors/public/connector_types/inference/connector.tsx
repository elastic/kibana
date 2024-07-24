/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import {
  FieldConfig,
  getFieldValidityAndErrorMessage,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { FormattedMessage } from '@kbn/i18n-react';
import { type ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import { getProviders, InferenceProvider, ProviderConfiguration } from './get_providers';
import * as i18n from './translations';

interface ProviderOption {
  value: string;
  label: string;
}

const { emptyField } = fieldValidators;

export const getProvidersOptions = (providers: InferenceProvider[]): ProviderOption[] => {
  const options: ProviderOption[] = [];

  providers.forEach((p: InferenceProvider) => {
    options.push({
      label: p.provider,
      value: p.provider,
    });
  });
  return options;
};

const getInferenceConfig = (): FieldConfig => ({
  label: i18n.PROVIDER,
  helpText: (
    <FormattedMessage
      defaultMessage="Inference API provider service. For more information on the URL, refer to the {inferenceAPIUrlDocs}."
      id="xpack.stackConnectors.components.inference.inferenceAPIDocumentation"
      values={{
        inferenceAPIUrlDocs: (
          <EuiLink
            data-test-subj="inference-api-doc"
            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/put-inference-api.html#put-inference-api-request-body"
            target="_blank"
          >
            {i18n.DOCUMENTATION}
          </EuiLink>
        ),
      }}
    />
  ),
  validations: [
    {
      validator: emptyField(i18n.PROVIDER_REQUIRED),
    },
  ],
});

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { http } = useKibana().services;
  const [{ config, secrets }] = useFormData({
    watch: [
      'config.taskType',
      'config.provider',
      'config.providerSchema',
      'secrets.providerSecrets',
    ],
  });

  const [localConfig, setLocalConfig] = useState<ProviderConfiguration>(config ?? {});
  const [selectedProvider, setSelectedProvider] = useState<InferenceProvider | undefined>();
  const [providersOptions, setProvidersOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [providers, setProviders] = useState<InferenceProvider[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(
    config?.taskType ?? 'completion'
  );

  const taskTypeOptions = [
    {
      label: 'completion',
      value: 'completion',
    },
  ];

  useEffect(() => {
    const loadProvidersFunction = async () => {
      const currentProviders = await getProviders(http!, selectedTaskType);
      if (Array.isArray(currentProviders)) {
        setProvidersOptions(getProvidersOptions(currentProviders));
        setProviders(currentProviders);
      }
    };
    loadProvidersFunction();
  }, [selectedTaskType, http]);

  return (
    <>
      <UseField
        path="config.taskType"
        component={SelectField}
        config={{
          label: i18n.TASK_TYPE,
        }}
        onChange={(taskType: string) => setSelectedTaskType(taskType)}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'taskTypeSelect',
            options: taskTypeOptions,
            fullWidth: true,
            readOnly,
          },
        }}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <UseField path="config.provider" config={getInferenceConfig()}>
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

              return (
                <EuiFormRow
                  id="providerSelectBox"
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.stackConnectors.components.inference.providerLabel"
                      defaultMessage="Provider"
                    />
                  }
                  isInvalid={isInvalid}
                  error={errorMessage}
                  helpText={
                    <FormattedMessage
                      defaultMessage="Inference API provider service. For more information on the URL, refer to the {inferenceAPIUrlDocs}."
                      id="xpack.stackConnectors.components.inference.inferenceAPIDocumentation"
                      values={{
                        inferenceAPIUrlDocs: (
                          <EuiLink
                            data-test-subj="inference-api-doc"
                            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/put-inference-api.html#put-inference-api-request-body"
                            target="_blank"
                          >
                            {i18n.DOCUMENTATION}
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                >
                  <EuiComboBox
                    fullWidth
                    singleSelection={{ asPlainText: true }}
                    async
                    isInvalid={isInvalid}
                    // noSuggestions={!providersOptions.length}
                    options={providersOptions}
                    data-test-subj="providersComboBox"
                    data-testid="providersComboBox"
                    selectedOptions={[]}
                    isDisabled={readOnly}
                    onChange={(provider) =>
                      setSelectedProvider(providers.find((p) => p.provider === provider[0].label))
                    }
                  />
                </EuiFormRow>
              );
            }}
          </UseField>
        </EuiFlexItem>
        {selectedProvider?.logo && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={selectedProvider?.logo} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ConnectorConfigurationFormItems
        isLoading={false}
        items={
          config?.providerSchema && secrets?.providerSecrets
            ? { ...config.providerSchema, ...secrets.providerSecrets }
            : selectedProvider?.configuration
            ? Object.keys(selectedProvider?.configuration).map((k) => ({
                key: k,
                ...selectedProvider?.configuration[k],
              }))
            : []
        }
        setConfigEntry={(key, value) => {
          const entry = localConfig[key];
          if (entry) {
            const newConfiguration: ProviderConfiguration = {
              ...localConfig,
              [key]: { ...entry, value },
            };
            setLocalConfig(newConfiguration);
          }
        }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
