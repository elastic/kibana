/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiComboBoxOptionOption,
  EuiTitle,
  EuiAccordion,
  EuiInputPopover,
  EuiFieldText,
  EuiFieldTextProps,
  EuiSelectableOption,
  EuiFormControlLayout,
  keys,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ConnectorFormSchema,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import { getTaskTypes, InferenceTaskType } from './get_task_types';
import * as i18n from './translations';
import { DEFAULT_TASK_TYPE } from './constants';
import { ConfigEntryView, ConfigProperties } from '../lib/dynamic_config/types';
import { SelectableProvider } from './providers/selectable';
import { Config, Secrets, ServiceProviderKeys } from './types';
import { InferenceProvider } from './providers/get_providers';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';

interface TaskTypeOption {
  value: string;
  label: string;
}

export const getTaskTypeOptions = (providers: InferenceTaskType[]): TaskTypeOption[] => {
  const options: TaskTypeOption[] = [];

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

  const [selectedProvider, setSelectedProvider] = useState<InferenceProvider>();
  const [taskTypeOptions, setTaskTypeOptions] = useState<EuiComboBoxOptionOption[]>([]);
  // const [providers, setProviders] = useState<InferenceProvider[]>([]);
  const [taskTypes, setTaskTypes] = useState<InferenceTaskType[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handlePopover = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const handleKeyboardOpen: EuiFieldTextProps['onKeyDown'] = useCallback((event) => {
    if (event.key === keys.ENTER) {
      setIsPopoverOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isEdit && config && !config.inferenceId) {
      config.inferenceId = uuidv4();
      setFieldValue('config.inferenceId', config.inferenceId);
    }
  }, [config, isEdit, setFieldValue, updateFieldValues]);

  useEffect(() => {
    const loadTaskTypesFunction = async () => {
      const currentTaskTypes = await getTaskTypes(http!, selectedProvider?.provider);
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

    const result: ConfigEntryView[] = (
      config?.providerConfig || secrets?.providerSecrets
        ? existingConfiguration
        : Object.keys(selectedProvider?.configuration ?? []).map((k: string) => ({
            key: k,
            isValid: true,
            validationErrors: [],
            ...(selectedProvider?.configuration[k] as ConfigProperties),
          }))
    ).sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

    if (config) {
      config.providerSchema = result;
    }
    return result;
  }, [config, secrets?.providerSecrets, selectedProvider]);

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
    (options: {
      providers: InferenceProvider[];
      taskType?: string;
      searchProviderValue: string;
    }) => {
      return options.providers.map(
        (p) =>
          ({
            label: p.provider,
          } as EuiSelectableOption)
      );
    },
    []
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

  const onProviderChange = useCallback(
    (newProvider?: InferenceProvider) => {
      setSelectedProvider(newProvider);
      // config.provider = newProvider?.provider;
      config.providerSchema = Object.keys(newProvider?.configuration ?? []).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];

      updateFieldValues({
        config: {
          provider: newProvider?.provider,
          providerSchema: config.providerSchema,
        },
      });
    },
    [config, updateFieldValues]
  );

  const providerSuperSelect = useMemo(
    () => (
      <EuiFormControlLayout
        clear={{ onClick: () => onProviderChange() }}
        isDropdown
        fullWidth
        icon={
          !selectedProvider
            ? { type: 'sparkles', side: 'left' }
            : SERVICE_PROVIDERS[selectedProvider?.provider as ServiceProviderKeys].icon
        }
      >
        <EuiFieldText
          onClick={handlePopover}
          onKeyDown={handleKeyboardOpen}
          value={selectedProvider?.provider ?? ''}
          fullWidth
          placeholder={i18n.SELECT_PROVIDER}
          icon={{ type: 'arrowDown', side: 'right' }}
          aria-expanded={isPopoverOpen}
          role="combobox"
        />
      </EuiFormControlLayout>
    ),
    [selectedProvider, handlePopover, handleKeyboardOpen, isPopoverOpen, onProviderChange]
  );

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
                  defaultMessage="Provider"
                />
              }
              isInvalid={isInvalid}
              error={errorMessage}
            >
              <EuiInputPopover
                id={'popoverId'}
                fullWidth
                input={providerSuperSelect}
                isOpen={isPopoverOpen}
                closePopover={handleClosePopover}
                className="rightArrowIcon"
              >
                <SelectableProvider
                  getSelectableOptions={onProviderOptionsSelect}
                  onClosePopover={handleClosePopover}
                  onProviderChange={onProviderChange}
                  taskType={selectedTaskType}
                />
              </EuiInputPopover>
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
        borders="none"
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
