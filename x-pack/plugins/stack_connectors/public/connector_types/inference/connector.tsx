/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiInputPopover,
  EuiFieldText,
  EuiFieldTextProps,
  EuiSelectableOption,
  EuiFormControlLayout,
  keys,
  EuiHorizontalRule,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ConnectorFormSchema,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ConfigEntryView } from '../../../common/dynamic_config/types';
import { InferenceTaskType } from '../../../common/inference/types';
import { ServiceProviderKeys } from '../../../common/inference/constants';
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import * as i18n from './translations';
import { DEFAULT_TASK_TYPE } from './constants';
import { SelectableProvider } from './providers/selectable';
import { Config, Secrets } from './types';
import { generateInferenceEndpointId, getTaskTypeOptions, TaskTypeOption } from './helpers';
import { useProviders } from './providers/get_providers';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';
import { AdditionalOptionsConnectorFields } from './additional_options_fields';
import {
  getProviderConfigHiddenField,
  getProviderSecretsHiddenField,
  getTaskTypeConfigHiddenField,
} from './hidden_fields';

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { updateFieldValues, setFieldValue, validateFields, isSubmitting } = useFormContext();
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'secrets.providerSecrets',
      'config.taskType',
      'config.taskTypeConfig',
      'config.inferenceId',
      'config.provider',
      'config.providerConfig',
    ],
  });

  const { data: providers, isLoading } = useProviders(http, toasts);

  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);

  const [providerSchema, setProviderSchema] = useState<ConfigEntryView[]>([]);
  const [optionalProviderFormFields, setOptionalProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [requiredProviderFormFields, setRequiredProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );

  const [taskTypeSchema, setTaskTypeSchema] = useState<ConfigEntryView[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [taskTypeFormFields, setTaskTypeFormFields] = useState<ConfigEntryView[]>([]);

  const handleProviderClosePopover = useCallback(() => {
    setProviderPopoverOpen(false);
  }, []);

  const handleProviderPopover = useCallback(() => {
    setProviderPopoverOpen((isOpen) => !isOpen);
  }, []);

  const handleProviderKeyboardOpen: EuiFieldTextProps['onKeyDown'] = useCallback((event: any) => {
    if (event.key === keys.ENTER) {
      setProviderPopoverOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isEdit && config && !config.inferenceId) {
      generateInferenceEndpointId(config, setFieldValue);
    }
  }, [isEdit, setFieldValue, config]);

  useEffect(() => {
    if (isSubmitting) {
      validateFields(['config.providerConfig']);
      validateFields(['secrets.providerSecrets']);
      validateFields(['config.taskTypeConfig']);
    }
  }, [isSubmitting, config, validateFields]);

  const onTaskTypeOptionsSelect = useCallback(
    (taskType: string, provider?: string) => {
      // Get task type settings
      const currentProvider = providers?.find((p) => p.provider === (provider ?? config?.provider));
      const currentTaskTypes = currentProvider?.task_types;
      const newTaskType = currentTaskTypes?.find((p) => p.task_type === taskType);

      setSelectedTaskType(taskType);

      // transform the schema
      const newTaskTypeSchema = Object.keys(newTaskType?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newTaskType?.configuration[k],
      })) as ConfigEntryView[];
      setTaskTypeSchema(newTaskTypeSchema);

      const configDefaults = Object.keys(newTaskType?.configuration ?? {}).reduce(
        (res: Record<string, unknown>, k) => {
          if (newTaskType?.configuration[k] && !!newTaskType?.configuration[k].default_value) {
            res[k] = newTaskType.configuration[k].default_value;
          } else {
            res[k] = null;
          }
          return res;
        },
        {}
      );

      updateFieldValues({
        config: {
          taskType,
          taskTypeConfig: configDefaults,
        },
      });
      generateInferenceEndpointId(
        { ...config, taskType, taskTypeConfig: configDefaults },
        setFieldValue
      );
    },
    [config, providers, setFieldValue, updateFieldValues]
  );

  const onProviderChange = useCallback(
    (provider?: string) => {
      const newProvider = providers?.find((p) => p.provider === provider);

      // Update task types list available for the selected provider
      const providerTaskTypes = (newProvider?.task_types ?? []).map((t) => t.task_type);
      setTaskTypeOptions(getTaskTypeOptions(providerTaskTypes));
      if (providerTaskTypes.length > 0) {
        onTaskTypeOptionsSelect(providerTaskTypes[0], provider);
      }

      // Update connector providerSchema
      const newProviderSchema = Object.keys(newProvider?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];

      setProviderSchema(newProviderSchema);

      const defaultProviderConfig: Record<string, unknown> = {};
      const defaultProviderSecrets: Record<string, unknown> = {};

      Object.keys(newProvider?.configuration ?? {}).forEach((k) => {
        if (!newProvider?.configuration[k].sensitive) {
          if (newProvider?.configuration[k] && !!newProvider?.configuration[k].default_value) {
            defaultProviderConfig[k] = newProvider.configuration[k].default_value;
          } else {
            defaultProviderConfig[k] = null;
          }
        } else {
          defaultProviderSecrets[k] = null;
        }
      });

      updateFieldValues({
        config: {
          provider: newProvider?.provider,
          providerConfig: defaultProviderConfig,
        },
        secrets: {
          providerSecrets: defaultProviderSecrets,
        },
      });
    },
    [onTaskTypeOptionsSelect, providers, updateFieldValues]
  );

  useEffect(() => {
    const getTaskTypeSchema = (taskTypes: InferenceTaskType[]) => {
      const newTaskType = taskTypes.find((p) => p.task_type === config?.taskType);

      // transform the schema
      const newTaskTypeSchema = Object.keys(newTaskType?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newTaskType?.configuration[k],
      })) as ConfigEntryView[];

      setTaskTypeSchema(newTaskTypeSchema);
    };

    if (config?.provider && isEdit) {
      const newProvider = providers?.find((p) => p.provider === config.provider);
      // Update connector providerSchema
      const newProviderSchema = Object.keys(newProvider?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];

      setProviderSchema(newProviderSchema);

      getTaskTypeSchema(newProvider?.task_types ?? []);
    }
  }, [config?.provider, config?.taskType, http, isEdit, providers]);

  useEffect(() => {
    // Set values from the provider secrets and config to the schema
    const existingConfiguration = providerSchema
      ? providerSchema.map((item: ConfigEntryView) => {
          const itemValue = item;
          itemValue.isValid = true;
          if (item.sensitive && secrets?.providerSecrets) {
            itemValue.value = secrets?.providerSecrets[item.key] as any;
          } else if (config?.providerConfig) {
            itemValue.value = config?.providerConfig[item.key] as any;
          }
          return itemValue;
        })
      : [];

    existingConfiguration.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setOptionalProviderFormFields(existingConfiguration.filter((p) => !p.required && !p.sensitive));
    setRequiredProviderFormFields(existingConfiguration.filter((p) => p.required || p.sensitive));
  }, [config?.providerConfig, providerSchema, secrets]);

  useEffect(() => {
    // Set values from the task type config to the schema
    const existingTaskTypeConfiguration = taskTypeSchema
      ? taskTypeSchema.map((item: ConfigEntryView) => {
          const itemValue = item;
          itemValue.isValid = true;
          if (config?.taskTypeConfig) {
            itemValue.value = config?.taskTypeConfig[item.key] as any;
          }
          return itemValue;
        })
      : [];
    existingTaskTypeConfiguration.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setTaskTypeFormFields(existingTaskTypeConfiguration);
  }, [config, taskTypeSchema]);

  const getProviderOptions = useCallback(() => {
    return providers?.map((p) => ({
      label: p.provider,
      key: p.provider,
    })) as EuiSelectableOption[];
  }, [providers]);

  const onSetProviderConfigEntry = useCallback(
    async (key: string, value: unknown) => {
      const entry: ConfigEntryView | undefined = providerSchema.find(
        (p: ConfigEntryView) => p.key === key
      );
      if (entry) {
        if (entry.sensitive) {
          if (!secrets.providerSecrets) {
            secrets.providerSecrets = {};
          }
          const newSecrets = { ...secrets.providerSecrets };
          newSecrets[key] = value;
          setFieldValue('secrets.providerSecrets', newSecrets);
          await validateFields(['secrets.providerSecrets']);
        } else {
          if (!config.providerConfig) {
            config.providerConfig = {};
          }
          const newConfig = { ...config.providerConfig };
          newConfig[key] = value;
          setFieldValue('config.providerConfig', newConfig);
          await validateFields(['config.providerConfig']);
        }
      }
    },
    [config, providerSchema, secrets, setFieldValue, validateFields]
  );

  const onClearProvider = useCallback(() => {
    onProviderChange();
    setFieldValue('config.taskType', '');
    setFieldValue('config.provider', '');
  }, [onProviderChange, setFieldValue]);

  const providerIcon = useMemo(
    () =>
      Object.keys(SERVICE_PROVIDERS).includes(config?.provider)
        ? SERVICE_PROVIDERS[config?.provider as ServiceProviderKeys].icon
        : undefined,
    [config?.provider]
  );

  const providerName = useMemo(
    () =>
      Object.keys(SERVICE_PROVIDERS).includes(config?.provider)
        ? SERVICE_PROVIDERS[config?.provider as ServiceProviderKeys].name
        : config?.provider,
    [config?.provider]
  );

  const providerSuperSelect = useCallback(
    (isInvalid: boolean) => (
      <EuiFormControlLayout
        clear={isEdit || readOnly ? undefined : { onClick: onClearProvider }}
        isDropdown
        isDisabled={isEdit || readOnly}
        isInvalid={isInvalid}
        fullWidth
        icon={!config?.provider ? { type: 'sparkles', side: 'left' } : providerIcon}
      >
        <EuiFieldText
          onClick={handleProviderPopover}
          data-test-subj="provider-select"
          isInvalid={isInvalid}
          disabled={isEdit || readOnly}
          onKeyDown={handleProviderKeyboardOpen}
          value={config?.provider ? providerName : ''}
          fullWidth
          placeholder={i18n.SELECT_PROVIDER}
          icon={{ type: 'arrowDown', side: 'right' }}
          aria-expanded={isProviderPopoverOpen}
          role="combobox"
        />
      </EuiFormControlLayout>
    ),
    [
      isEdit,
      readOnly,
      onClearProvider,
      config?.provider,
      providerIcon,
      handleProviderPopover,
      handleProviderKeyboardOpen,
      providerName,
      isProviderPopoverOpen,
    ]
  );

  return (
    <>
      <UseField
        path="config.provider"
        config={{
          validations: [
            {
              validator: fieldValidators.emptyField(i18n.PROVIDER_REQUIRED),
              isBlocking: true,
            },
          ],
        }}
      >
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
          const selectInput = providerSuperSelect(isInvalid);
          return (
            <EuiFormRow
              id="providerSelectBox"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.stackConnectors.components.inference.providerLabel"
                  defaultMessage="Service"
                />
              }
              isInvalid={isInvalid}
              error={errorMessage}
            >
              <EuiInputPopover
                id={'popoverId'}
                fullWidth
                input={selectInput}
                isOpen={isProviderPopoverOpen}
                closePopover={handleProviderClosePopover}
                className="rightArrowIcon"
              >
                <SelectableProvider
                  isLoading={isLoading}
                  getSelectableOptions={getProviderOptions}
                  onClosePopover={handleProviderClosePopover}
                  onProviderChange={onProviderChange}
                />
              </EuiInputPopover>
            </EuiFormRow>
          );
        }}
      </UseField>
      {config?.provider ? (
        <>
          <EuiSpacer size="m" />
          <ConnectorConfigurationFormItems
            itemsGrow={false}
            isLoading={false}
            direction="column"
            items={requiredProviderFormFields}
            setConfigEntry={onSetProviderConfigEntry}
          />
          <EuiSpacer size="m" />
          <AdditionalOptionsConnectorFields
            config={config}
            readOnly={readOnly}
            isEdit={isEdit}
            optionalProviderFormFields={optionalProviderFormFields}
            onSetProviderConfigEntry={onSetProviderConfigEntry}
            onTaskTypeOptionsSelect={onTaskTypeOptionsSelect}
            taskTypeFormFields={taskTypeFormFields}
            taskTypeSchema={taskTypeSchema}
            taskTypeOptions={taskTypeOptions}
            selectedTaskType={selectedTaskType}
          />
          <EuiSpacer size="l" />
          <EuiHorizontalRule />
          {getProviderSecretsHiddenField(
            providerSchema,
            setRequiredProviderFormFields,
            isSubmitting
          )}
          {getProviderConfigHiddenField(
            providerSchema,
            setRequiredProviderFormFields,
            isSubmitting
          )}
          {getTaskTypeConfigHiddenField(taskTypeSchema, setTaskTypeFormFields, isSubmitting)}
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
