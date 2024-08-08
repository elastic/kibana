/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiIcon,
  EuiFlexItem,
  EuiTitle,
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
import {
  ConnectorFormSchema,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import { getProviders, InferenceProvider } from './get_providers';
import * as i18n from './translations';
import { DEFAULT_TASK_TYPE, SUPPORTED_TASK_TYPES } from './constants';
import { ConfigEntryView, ConfigProperties } from '../lib/dynamic_config/types';
import { Config, Secrets } from './types';

interface ProviderOption {
  value: string;
  label: string;
  prepend?: ReactNode;
}

const { emptyField } = fieldValidators;

export const getProvidersOptions = (providers: InferenceProvider[]): ProviderOption[] => {
  const options: ProviderOption[] = [];

  providers.forEach((p: InferenceProvider) => {
    options.push({
      label: p.provider,
      value: p.provider,
      prepend: p?.logo && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={p?.logo} />
        </EuiFlexItem>
      ),
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
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'config.taskType',
      'config.provider',
      'config.providerSchema',
      'config.providerConfig',
      'secrets.providerSecrets',
    ],
  });

  const [selectedProvider, setSelectedProvider] = useState<InferenceProvider | undefined>();
  const [providersOptions, setProvidersOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [providers, setProviders] = useState<InferenceProvider[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(
    config?.taskType ?? 'completion'
  );

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

  const providerForm: ConfigEntryView[] = useMemo(() => {
    const existingConfiguration = (config?.providerSchema ?? []).map((item: ConfigEntryView) => {
      const itemValue = item;
      if (item.sensitive && secrets?.providerSecrets) {
        itemValue.value = secrets?.providerSecrets[item.key] as any;
      } else if (config?.providerConfig) {
        itemValue.value = config?.providerConfig[item.key] as any;
      }
      return itemValue;
    });

    const result: ConfigEntryView[] = (
      config?.providerConfig && secrets?.providerSecrets
        ? existingConfiguration
        : Object.keys(selectedProvider?.configuration ?? []).map((k: string) => ({
            key: k,
            isValid: true,
            validationErrors: [],
            ...(selectedProvider?.configuration[k] as ConfigProperties),
          }))
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (config) {
      config.providerSchema = result;
    }
    return result;
  }, [config, secrets, selectedProvider]);

  const onProviderSelect = useCallback(
    (provider) => {
      const newProvider = providers.find((p) => p.provider === provider[0].label);
      setSelectedProvider(newProvider);
      config.provider = provider;
      config.providerSchema = Object.keys(newProvider?.configuration ?? []).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];
    },
    [config, providers]
  );

  const onSetConfigEntry = useCallback(
    (key: string, value: unknown) => {
      const entry: ConfigEntryView | undefined = config?.providerSchema.find(
        (p: ConfigEntryView) => p.key === key
      );
      if (entry) {
        if (entry.sensitive) {
          if (!secrets.providerSecrets) {
            secrets.providerSecrets = {};
          }
          secrets.providerSecrets[key] = value;
        } else {
          if (!config.providerConfig) {
            config.providerConfig = {};
          }
          config.providerConfig[key] = value;
        }
      }
    },
    [config, secrets]
  );

  return (
    <>
      <UseField
        path="config.taskType"
        component={SelectField}
        defaultValue={DEFAULT_TASK_TYPE}
        config={{
          label: i18n.TASK_TYPE,
        }}
        onChange={(taskType: string) => {
          setSelectedTaskType(taskType);
          config.taskType = taskType;
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'taskTypeSelect',
            options: SUPPORTED_TASK_TYPES,
            fullWidth: true,
            readOnly,
          },
          helpText: (
            <FormattedMessage
              defaultMessage="Inference endpoints have configurable task types of 'completion', 'rerank' and more. Configuration of an AI Assistant will require a 'completion' task type to the model provider of your choice."
              id="xpack.stackConnectors.components.inference.inferenceTaskTypeDocumentation"
            />
          ),
        }}
      />
      <EuiSpacer size="m" />

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
                options={providersOptions}
                data-test-subj="providersComboBox"
                data-testid="providersComboBox"
                selectedOptions={selectedProvider ? getProvidersOptions([selectedProvider]) : []}
                isDisabled={readOnly}
                onChange={onProviderSelect}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" data-test-subj="provider-details-label">
        <h4>
          <FormattedMessage
            id="xpack.stackConnectors.components.inference.providerDetailsLabel"
            defaultMessage="Provider details"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ConnectorConfigurationFormItems
        itemsGrow={false}
        isLoading={false}
        items={providerForm.splice(0, providerForm.length / 2)}
        setConfigEntry={onSetConfigEntry}
      />
      <EuiSpacer size="m" />
      <ConnectorConfigurationFormItems
        itemsGrow={false}
        isLoading={false}
        items={providerForm.splice(providerForm.length / 2 - 1, providerForm.length)}
        setConfigEntry={onSetConfigEntry}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
