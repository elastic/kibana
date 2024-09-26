/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  EuiAccordion,
  EuiInputPopover,
  EuiFieldText,
  EuiFieldTextProps,
  EuiSelectableOption,
  EuiFormControlLayout,
  keys,
  useEuiTheme,
  EuiTextColor,
  EuiButtonGroup,
  EuiPanel,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiCopy,
  EuiButton,
  useEuiFontSize,
} from '@elastic/eui';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
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
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import { getTaskTypes } from './get_task_types';
import * as i18n from './translations';
import { DEFAULT_PROVIDER, DEFAULT_TASK_TYPE } from './constants';
import { ConfigEntryView } from '../lib/dynamic_config/types';
import { SelectableProvider } from './providers/selectable';
import { Config, Secrets, ServiceProviderKeys } from './types';
import {
  generateInferenceEndpointId,
  getTaskTypeOptions,
  getValidator,
  TaskTypeOption,
} from './helpers';
import { InferenceProvider } from './providers/get_providers';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';

// Custom trigger button CSS
const buttonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { http } = useKibana().services;
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const { euiTheme } = useEuiTheme();
  const { updateFieldValues, setFieldValue, validateFields, isSubmitting } = useFormContext();
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'secrets.providerSecrets',
      'config.taskType',
      'config.taskTypeSchema',
      'config.taskTypeConfig',
      'config.inferenceId',
      'config.provider',
      'config.providerSchema',
      'config.providerConfig',
    ],
  });

  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);
  const [optionalProviderFormFields, setOptionalProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [requiredProviderFormFields, setRequiredProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );

  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [taskTypeFormFields, setTaskTypeFormFields] = useState<ConfigEntryView[]>([]);

  const handleProviderClosePopover = useCallback(() => {
    setProviderPopoverOpen(false);
  }, []);

  const handleProviderPopover = useCallback(() => {
    setProviderPopoverOpen((isOpen) => !isOpen);
  }, []);

  const handleProviderKeyboardOpen: EuiFieldTextProps['onKeyDown'] = useCallback((event) => {
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

  useEffect(() => {
    // Set values from the provider secrets and config to the schema
    const existingConfiguration = config?.providerSchema
      ? config.providerSchema.map((item: ConfigEntryView) => {
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
    setOptionalProviderFormFields(existingConfiguration.filter((p) => !p.required));
    setRequiredProviderFormFields(existingConfiguration.filter((p) => p.required));
  }, [config, secrets]);

  useEffect(() => {
    // Set values from the task type config to the schema
    const existingTaskTypeConfiguration = config?.taskTypeSchema
      ? config.taskTypeSchema.map((item: ConfigEntryView) => {
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
  }, [config]);

  const getProviderOptions = useCallback(
    (options: { providers: InferenceProvider[]; searchProviderValue: string }) => {
      return options.providers.map(
        (p) =>
          ({
            label: p.provider,
            key: p.provider,
          } as EuiSelectableOption)
      );
    },
    []
  );

  const onTaskTypeOptionsSelect = useCallback(
    async (taskType) => {
      // Get task type settings
      const currentTaskTypes = await getTaskTypes(http!, config?.provider ?? '');
      const newTaskType = currentTaskTypes?.find((p) => p.task_type === taskType);

      setSelectedTaskType(taskType);
      generateInferenceEndpointId(config, setFieldValue);
      const newTaskTypeSchema = Object.keys(newTaskType?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newTaskType?.configuration[k],
      })) as ConfigEntryView[];

      updateFieldValues({
        config: {
          taskType,
          taskTypeSchema: newTaskTypeSchema,
          taskTypeConfig: {},
        },
      });
    },
    [config, http, setFieldValue, updateFieldValues]
  );

  const onSetProviderConfigEntry = useCallback(
    async (key: string, value: unknown) => {
      const entry: ConfigEntryView | undefined = config?.providerSchema.find(
        (p: ConfigEntryView) => p.key === key
      );
      if (entry) {
        if (entry.sensitive) {
          if (!secrets.providerSecrets) {
            secrets.providerSecrets = {};
          }
          secrets.providerSecrets[key] = value;
          setFieldValue('secrets.providerSecrets', secrets.providerSecrets);
          await validateFields(['secrets.providerSecrets']);
        } else {
          if (!config.providerConfig) {
            config.providerConfig = {};
          }
          config.providerConfig[key] = value;
          setFieldValue('config.providerConfig', config.providerConfig);
          await validateFields(['config.providerConfig']);
        }
      }
    },
    [config, secrets, setFieldValue, validateFields]
  );

  const onSetTaskTypeConfigEntry = useCallback(
    (key: string, value: unknown) => {
      if (config?.taskTypeSchema) {
        const entry: ConfigEntryView | undefined = config.taskTypeSchema.find(
          (p: ConfigEntryView) => p.key === key
        );
        if (entry) {
          if (!config.taskTypeConfig) {
            config.taskTypeConfig = {};
          }
          config.taskTypeConfig[key] = value;
          setFieldValue('config.taskTypeConfig', config.taskTypeConfig);
        }
      }
    },
    [config, setFieldValue]
  );

  const onProviderChange = useCallback(
    async (newProvider?: InferenceProvider) => {
      config.provider = newProvider?.provider ?? DEFAULT_PROVIDER;

      // Update task types list available for the selected provider
      const providerTaskTypes = newProvider?.taskTypes ?? [];
      setTaskTypeOptions(getTaskTypeOptions(providerTaskTypes));
      if (providerTaskTypes.length > 0) {
        await onTaskTypeOptionsSelect(providerTaskTypes[0]);
      }

      generateInferenceEndpointId(config, setFieldValue);

      // Update connector providerSchema
      config.providerSchema = Object.keys(newProvider?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];

      updateFieldValues({
        config: {
          provider: newProvider?.provider,
          providerSchema: config.providerSchema,
          providerConfig: {},
        },
        secrets: {
          providerSecrets: {},
        },
      });
    },
    [config, onTaskTypeOptionsSelect, setFieldValue, updateFieldValues]
  );

  const providerSuperSelect = useCallback(
    (isInvalid: boolean) => (
      <EuiFormControlLayout
        clear={isEdit || readOnly ? undefined : { onClick: () => onProviderChange() }}
        isDropdown
        isDisabled={isEdit || readOnly}
        isInvalid={isInvalid}
        fullWidth
        icon={
          !config?.provider
            ? { type: 'sparkles', side: 'left' }
            : SERVICE_PROVIDERS[config?.provider as ServiceProviderKeys].icon
        }
      >
        <EuiFieldText
          onClick={handleProviderPopover}
          isInvalid={isInvalid}
          disabled={isEdit || readOnly}
          onKeyDown={handleProviderKeyboardOpen}
          value={
            config?.provider ? SERVICE_PROVIDERS[config?.provider as ServiceProviderKeys].name : ''
          }
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
      config?.provider,
      handleProviderPopover,
      handleProviderKeyboardOpen,
      isProviderPopoverOpen,
      onProviderChange,
    ]
  );

  const taskTypeSettings = useMemo(
    () =>
      selectedTaskType || config?.taskType.length ? (
        <>
          <EuiTitle size="xxs" data-test-subj="task-type-details-label">
            <h4>
              <FormattedMessage
                id="xpack.stackConnectors.components.inference.taskTypeDetailsLabel"
                defaultMessage="Task settings"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <div
            css={css`
              font-size: ${xsFontSize};
              color: ${euiTheme.colors.subduedText};
            `}
          >
            <FormattedMessage
              id="xpack.stackConnectors.components.inference.taskTypeHelpLabel"
              defaultMessage="Configure the inference task. These settings are specific to the task type you specified."
            />
          </div>
          <EuiSpacer size="m" />
          <UseField
            path="config.taskType"
            config={{
              validations: [
                {
                  validator: fieldValidators.emptyField(i18n.TASK_TYPE_REQUIRED),
                  isBlocking: true,
                },
              ],
            }}
          >
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

              return (
                <EuiFormRow
                  id="taskType"
                  label={
                    <FormattedMessage
                      id="xpack.stackConnectors.components.inference.taskTypeLabel"
                      defaultMessage="Task type"
                    />
                  }
                  isInvalid={isInvalid}
                  error={errorMessage}
                  helpText={
                    <FormattedMessage
                      id="xpack.stackConnectors.components.inference.taskTypeSelectHelpLabel"
                      defaultMessage="Configuration of AI Assistants requires a 'completion' task type."
                    />
                  }
                >
                  {isEdit ? (
                    <EuiButton href="#/navigation/button" isDisabled>
                      {config?.taskType}
                    </EuiButton>
                  ) : (
                    <EuiButtonGroup
                      data-test-subj="taskTypeSelect"
                      legend="Task type"
                      defaultValue={DEFAULT_TASK_TYPE}
                      isDisabled={readOnly}
                      idSelected={config?.taskType}
                      onChange={onTaskTypeOptionsSelect}
                      options={taskTypeOptions}
                      color="text"
                      type="single"
                    />
                  )}
                </EuiFormRow>
              );
            }}
          </UseField>
          <EuiSpacer size="s" />
          <ConnectorConfigurationFormItems
            itemsGrow={false}
            isLoading={false}
            direction="column"
            items={taskTypeFormFields}
            setConfigEntry={onSetTaskTypeConfigEntry}
          />
        </>
      ) : null,
    [
      selectedTaskType,
      config?.taskType,
      xsFontSize,
      euiTheme.colors.subduedText,
      taskTypeFormFields,
      onSetTaskTypeConfigEntry,
      isEdit,
      readOnly,
      onTaskTypeOptionsSelect,
      taskTypeOptions,
    ]
  );

  const inferenceUri = useMemo(() => `_inference/${selectedTaskType}/`, [selectedTaskType]);

  const additionalOptions = useMemo(
    () =>
      config?.provider ? (
        <EuiAccordion
          id="inferenceAdditionalOptions"
          buttonProps={{ css: buttonCss }}
          css={css`
            .euiAccordion__triggerWrapper {
              display: inline-flex;
            }
          `}
          element="fieldset"
          arrowDisplay="right"
          arrowProps={{
            color: 'primary',
          }}
          buttonElement="button"
          borders="none"
          buttonContent={
            <EuiTextColor color={euiTheme.colors.primary}>
              <FormattedMessage
                id="xpack.stackConnectors.components.inference.additionalOptionsLabel"
                defaultMessage="Additional options"
              />
            </EuiTextColor>
          }
          initialIsOpen={true}
        >
          <EuiSpacer size="m" />
          <EuiPanel hasBorder={true}>
            {optionalProviderFormFields.length > 0 ? (
              <>
                <EuiTitle size="xxs" data-test-subj="provider-optional-settings-label">
                  <h4>
                    <FormattedMessage
                      id="xpack.stackConnectors.components.inference.providerOptionalSettingsLabel"
                      defaultMessage="Service settings"
                    />
                  </h4>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <div
                  css={css`
                    font-size: ${xsFontSize};
                    color: ${euiTheme.colors.subduedText};
                  `}
                >
                  <FormattedMessage
                    id="xpack.stackConnectors.components.inference.providerOptionalSettingsHelpLabel"
                    defaultMessage="Configure the inference provider. These settings are optional provider settings."
                  />
                </div>
                <EuiSpacer size="m" />
                <ConnectorConfigurationFormItems
                  itemsGrow={false}
                  isLoading={false}
                  direction="column"
                  items={optionalProviderFormFields}
                  setConfigEntry={onSetProviderConfigEntry}
                />
                <EuiSpacer size="m" />
              </>
            ) : null}

            {taskTypeSettings}
            <EuiHorizontalRule />
            <EuiTitle size="xxs" data-test-subj="task-type-details-label">
              <h4>
                <FormattedMessage
                  id="xpack.stackConnectors.components.inference.inferenceEndpointLabel"
                  defaultMessage="Inference Endpoint"
                />
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <div
              css={css`
                font-size: ${xsFontSize};
                color: ${euiTheme.colors.subduedText};
              `}
            >
              <FormattedMessage
                id="xpack.stackConnectors.components.inference.inferenceEndpointHelpLabel"
                defaultMessage="Inference endpoints provide a simplified method for using this configuration, ecpecially from the API"
              />
            </div>
            <EuiSpacer size="s" />

            <UseField path="config.inferenceId">
              {(field) => {
                const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

                return (
                  <EuiFormRow
                    id="inferenceId"
                    isInvalid={isInvalid}
                    error={errorMessage}
                    fullWidth
                    helpText={
                      <FormattedMessage
                        id="xpack.stackConnectors.components.inference.inferenceIdHelpLabel"
                        defaultMessage="This ID cannot be changed once created."
                      />
                    }
                  >
                    <EuiFieldText
                      fullWidth
                      disabled={isEdit || readOnly}
                      value={config?.inferenceId}
                      onChange={(e) => {
                        setFieldValue('config.inferenceId', e.target.value);
                      }}
                      prepend={inferenceUri}
                      append={
                        <EuiCopy
                          beforeMessage={i18n.COPY_TOOLTIP}
                          afterMessage={i18n.COPIED_TOOLTIP}
                          textToCopy={`${inferenceUri}${config?.inferenceId}`}
                        >
                          {(copy) => (
                            <EuiButtonEmpty
                              iconType="copy"
                              size="xs"
                              iconSide="right"
                              onClick={copy}
                              data-test-subj="copyInferenceUriToClipboard"
                            >
                              <FormattedMessage
                                id="xpack.stackConnectors.components.inference.copyLabel"
                                defaultMessage="Copy"
                              />
                            </EuiButtonEmpty>
                          )}
                        </EuiCopy>
                      }
                    />
                  </EuiFormRow>
                );
              }}
            </UseField>
          </EuiPanel>
        </EuiAccordion>
      ) : null,
    [
      config?.inferenceId,
      config?.provider,
      euiTheme.colors.primary,
      euiTheme.colors.subduedText,
      inferenceUri,
      isEdit,
      onSetProviderConfigEntry,
      optionalProviderFormFields,
      readOnly,
      setFieldValue,
      taskTypeSettings,
      xsFontSize,
    ]
  );
  const providerSecretsHiddenField = (
    <UseField
      path="secrets.providerSecrets"
      component={HiddenField}
      config={{
        validations: [
          {
            validator: getValidator('config.providerSchema', setRequiredProviderFormFields, true),
            isBlocking: true,
          },
        ],
      }}
    />
  );
  const providerConfigHiddenField = (
    <UseField
      path="config.providerConfig"
      component={HiddenField}
      config={{
        validations: [
          {
            validator: getValidator('config.providerSchema', setRequiredProviderFormFields),
            isBlocking: true,
          },
        ],
      }}
    />
  );
  const providerSchemaHiddenField = (
    <UseField path="config.providerSchema" component={HiddenField} />
  );
  const taskTypeSchemaHiddenField = (
    <UseField path="config.taskTypeSchema" component={HiddenField} />
  );
  const taskTypeConfigHiddenField = (
    <UseField
      path="config.taskTypeConfig"
      component={HiddenField}
      config={{
        validations: [
          {
            validator: getValidator('config.taskTypeSchema', setTaskTypeFormFields),
            isBlocking: true,
          },
        ],
      }}
    />
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
                  getSelectableOptions={getProviderOptions}
                  onClosePopover={handleProviderClosePopover}
                  onProviderChange={onProviderChange}
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
        items={requiredProviderFormFields}
        setConfigEntry={onSetProviderConfigEntry}
      />
      <EuiSpacer size="m" />
      {additionalOptions}
      <EuiSpacer size="l" />
      <EuiHorizontalRule />
      {providerSecretsHiddenField}
      {providerConfigHiddenField}
      {providerSchemaHiddenField}
      {taskTypeSchemaHiddenField}
      {taskTypeConfigHiddenField}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
