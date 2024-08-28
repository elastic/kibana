/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiIcon,
  EuiFlexItem,
  EuiTitle,
  EuiAccordion,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
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
import { getTaskTypes, InferenceTaskType } from './get_task_types';
import * as i18n from './translations';
import { DEFAULT_TASK_TYPE, DEFAULT_PROVIDER } from './constants';
import { ConfigEntryView, ConfigProperties } from '../lib/dynamic_config/types';
import { Config, Secrets } from './types';

interface ProviderOption {
  value: string;
  label: string;
  prepend?: ReactNode;
}

interface TaskTypeOption {
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
      prepend: p?.logo && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={p?.logo} />
        </EuiFlexItem>
      ),
    });
  });
  return options;
};

export const getTaskTypeOptions = (providers: InferenceTaskType[]): TaskTypeOption[] => {
  const options: ProviderOption[] = [];

  providers.forEach((p: InferenceTaskType) => {
    options.push({
      label: p.task_type,
      value: p.task_type,
    });
  });
  return options;
};

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
  // registerPreSubmitValidator
}) => {
  const { http } = useKibana().services;
  const { updateFieldValues, setFieldValue } = useFormContext();
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'config.taskType',
      'config.taskTypeSchema',
      'config.taskTypeConfig',
      'config.inferenceId',
      'config.provider',
      'config.providerSchema',
      'config.providerConfig',
      'secrets',
      'secrets.providerSecrets',
    ],
  });

  const [selectedProvider, setSelectedProvider] = useState<string>(DEFAULT_PROVIDER);
  const [providersOptions, setProvidersOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [providers, setProviders] = useState<InferenceProvider[]>([]);
  const [taskTypes, setTaskTypes] = useState<InferenceTaskType[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);

  useEffect(() => {
    if (!isEdit && config && !config.inferenceId) {
      config.inferenceId = uuidv4();
      setFieldValue('config.inferenceId', config.inferenceId);
      console.log(config.inferenceId);
    }
  }, [config, isEdit, setFieldValue, updateFieldValues]);

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

  useEffect(() => {
    const loadTaskTypesFunction = async () => {
      const currentTaskTypes = await getTaskTypes(http!, selectedProvider);
      if (Array.isArray(currentTaskTypes)) {
        setTaskTypeOptions(getTaskTypeOptions(currentTaskTypes));
        setTaskTypes(currentTaskTypes);
      }
    };
    loadTaskTypesFunction();
  }, [http, selectedProvider]);

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

    const selectedProviderConfig = providers.find((t) => t.provider === selectedProvider);
    const result: ConfigEntryView[] = (
      config?.providerConfig || secrets?.providerSecrets
        ? existingConfiguration
        : Object.keys(selectedProviderConfig?.configuration ?? []).map((k: string) => ({
            key: k,
            isValid: true,
            validationErrors: [],
            ...(selectedProviderConfig?.configuration[k] as ConfigProperties),
          }))
    ).sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

    if (config) {
      config.providerSchema = result;
    }
    return result;
  }, [config, providers, secrets?.providerSecrets, selectedProvider]);

  const taskTypeForm: ConfigEntryView[] = useMemo(() => {
    const existingConfiguration = (config?.taskTypeSchema ?? []).map((item: ConfigEntryView) => {
      if (config?.taskTypeConfig) {
        item.value = config?.taskTypeConfig[item.key] as any;
      }
      return item;
    });

    const selectedTaskTypeConfig = taskTypes.find((t) => t.task_type === selectedTaskType);
    const result: ConfigEntryView[] = (
      config?.taskTypeConfig
        ? existingConfiguration
        : Object.keys(selectedTaskTypeConfig?.configuration ?? []).map((k: string) => ({
            key: k,
            isValid: true,
            validationErrors: [],
            ...(selectedTaskTypeConfig?.configuration[k] as ConfigProperties),
          }))
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (config) {
      config.taskTypeSchema = result;
    }
    return result;
  }, [config, selectedTaskType, taskTypes]);

  const getTaskTypeForm = useCallback(
    (isFirstColumn: boolean) => {
      const indexToSplit = Math.ceil(taskTypeForm.length / 2);
      const firstHalf = taskTypeForm.slice(0, indexToSplit);
      const secondHalf = taskTypeForm.slice(indexToSplit);
      return isFirstColumn ? firstHalf : secondHalf;
    },
    [taskTypeForm]
  );

  const onProviderOptionsSelect = useCallback(
    (providerOptions) => {
      const provider = providerOptions[0].label;
      const newProvider = providers.find((p) => p.provider === provider);
      setSelectedProvider(newProvider?.provider ?? DEFAULT_PROVIDER);
      config.provider = provider;
      config.providerSchema = Object.keys(newProvider?.configuration ?? []).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];

      updateFieldValues({
        config: {
          provider,
          providerSchema: config.providerSchema,
        },
      });
    },
    [config, providers, updateFieldValues]
  );

  const onTaskTypeOptionsSelect = useCallback(
    (taskType) => {
      const newTaskType = taskTypes.find((p) => p.task_type === taskType);
      setSelectedTaskType(newTaskType?.task_type ?? DEFAULT_TASK_TYPE);
      config.taskType = taskType;
      config.taskTypeSchema = Object.keys(newTaskType?.configuration ?? []).map((k) => ({
        key: k,
        isValid: true,
        ...newTaskType?.configuration[k],
      })) as ConfigEntryView[];
    },
    [config, taskTypes]
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

  // Custom trigger button CSS
  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  return (
    <>
      <UseField path="config.provider">
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

          return (
            <EuiFormRow
              id="providerSelectBox"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.stackConnectors.components.inference.providerLabel"
                  defaultMessage="Service provider"
                />
              }
              isInvalid={isInvalid}
              error={errorMessage}
              helpText={
                <FormattedMessage
                  defaultMessage="Inference API provider service. For more information on the URL, refer to the {inferencePutAPIUrlDocs}."
                  id="xpack.stackConnectors.components.inference.inferencePutAPIDocumentation"
                  values={{
                    inferencePutAPIUrlDocs: (
                      <EuiLink
                        data-test-subj="inference-put-api-doc"
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
                selectedOptions={
                  selectedProvider
                    ? getProvidersOptions(providers.filter((p) => p.provider === selectedProvider))
                    : []
                }
                isDisabled={readOnly || isEdit}
                onChange={onProviderOptionsSelect}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <EuiSpacer size="m" />
      <ConnectorConfigurationFormItems
        itemsGrow={false}
        isLoading={false}
        direction="column"
        items={providerForm}
        setConfigEntry={onSetConfigEntry}
      />
      <EuiSpacer size="m" />

      <EuiAccordion
        id="inferenceAdditionalOptions"
        buttonProps={{ paddingSize: 's', css: buttonCss }}
        element="fieldset"
        arrowDisplay="right"
        buttonElement="button"
        borders="all"
        buttonContent={
          <FormattedMessage
            id="xpack.stackConnectors.components.inference.additionalOptionsLabel"
            defaultMessage="Additional options"
          />
        }
        initialIsOpen={true}
      >
        <>
          <UseField
            path="config.taskType"
            component={SelectField}
            defaultValue={DEFAULT_TASK_TYPE}
            isDisabled={readOnly || isEdit}
            config={{
              label: i18n.TASK_TYPE,
            }}
            onChange={onTaskTypeOptionsSelect}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'taskTypeSelect',
                options: taskTypeOptions,
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
          <EuiTitle size="xxs" data-test-subj="task-type-details-label">
            <h4>
              <FormattedMessage
                id="xpack.stackConnectors.components.inference.taskTypeDetailsLabel"
                defaultMessage="Task type details"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <ConnectorConfigurationFormItems
            itemsGrow={false}
            isLoading={false}
            items={getTaskTypeForm(true)}
            setConfigEntry={onSetConfigEntry}
          />
          <EuiSpacer size="m" />
          <ConnectorConfigurationFormItems
            itemsGrow={false}
            isLoading={false}
            items={getTaskTypeForm(false)}
            setConfigEntry={onSetConfigEntry}
          />
        </>
      </EuiAccordion>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
