/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiAccordion,
  EuiFieldText,
  EuiFieldPassword,
  EuiSwitch,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFieldNumber,
  EuiCheckableCard,
  useGeneratedHtmlId,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import {
  ensureBooleanType,
  ensureCorrectTyping,
  ensureStringType,
} from './connector_configuration_utils';
import { ConfigEntryView, DisplayType } from './types';

interface ConnectorConfigurationFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  setConfigValue: (value: number | string | boolean | null) => void;
}

interface ConfigInputFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  validateAndSetConfigValue: (value: string | boolean) => void;
}
export const ConfigInputField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const { isValid, required, placeholder, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiFieldText
      disabled={isLoading}
      fullWidth
      required={required}
      value={ensureStringType(innerValue)}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
      placeholder={placeholder}
    />
  );
};

export const ConfigSwitchField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const { label, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiSwitch
      checked={ensureBooleanType(innerValue)}
      disabled={isLoading}
      label={<p>{label}</p>}
      onChange={(event) => {
        setInnerValue(event.target.checked);
        validateAndSetConfigValue(event.target.checked);
      }}
    />
  );
};

export const ConfigInputTextArea: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { isValid, required, placeholder, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiTextArea
      disabled={isLoading}
      fullWidth
      required={required}
      // ensures placeholder shows up when value is empty string
      value={ensureStringType(innerValue) || undefined}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
      placeholder={placeholder}
    />
  );
};

export const ConfigNumberField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const { isValid, required, placeholder, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <EuiFieldNumber
      fullWidth
      disabled={isLoading}
      required={required}
      value={innerValue as number}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
      placeholder={placeholder}
    />
  );
};

export const ConfigCheckableField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const radioCardId = useGeneratedHtmlId({ prefix: 'radioCard' });
  const { value, options } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <>
      {options?.map((o) => (
        <>
          <EuiCheckableCard
            id={radioCardId}
            label={o.label}
            value={innerValue as any}
            checked={innerValue === o.value}
            onChange={(event) => {
              setInnerValue(o.value);
              validateAndSetConfigValue(o.value);
            }}
          />
          <EuiSpacer size="s" />
        </>
      ))}
    </>
  );
};

export const ConfigSensitiveTextArea: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { key, label } = configEntry;
  return (
    <EuiAccordion id={key + '-accordion'} buttonContent={<p>{label}</p>}>
      <ConfigInputTextArea
        isLoading={isLoading}
        configEntry={configEntry}
        validateAndSetConfigValue={validateAndSetConfigValue}
      />
    </EuiAccordion>
  );
};

export const ConfigInputPassword: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { required, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  return (
    <>
      <EuiFieldPassword
        fullWidth
        disabled={isLoading}
        required={required}
        type="dual"
        value={ensureStringType(innerValue)}
        onChange={(event) => {
          setInnerValue(event.target.value);
          validateAndSetConfigValue(event.target.value);
        }}
      />
    </>
  );
};

export const ConfigSelectField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const { isValid, required, options, value } = configEntry;
  const [innerValue, setInnerValue] = useState(value);
  const optionsRes = options?.map((o) => ({
    value: o.value,
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {o.icon ? (
          <EuiFlexItem grow={false}>
            <EuiIcon color="subdued" style={{ lineHeight: 'inherit' }} type={o.icon} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiText>{o.label}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));
  return (
    <EuiSuperSelect
      fullWidth
      disabled={isLoading}
      options={optionsRes as any}
      valueOfSelected={innerValue as any}
      onChange={(newValue) => {
        setInnerValue(newValue);
        validateAndSetConfigValue(newValue);
      }}
    />
  );
};

export const ConnectorConfigurationField: React.FC<ConnectorConfigurationFieldProps> = ({
  configEntry,
  isLoading,
  setConfigValue,
}) => {
  const validateAndSetConfigValue = (value: number | string | boolean) => {
    setConfigValue(ensureCorrectTyping(configEntry.type, value));
  };

  const { key, display, options, required, sensitive, value } = configEntry;

  switch (display) {
    case DisplayType.DROPDOWN:
      return (
        <ConfigSelectField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

    case DisplayType.CHECKABLE:
      return (
        <ConfigCheckableField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

    case DisplayType.NUMERIC:
      return (
        <ConfigNumberField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

    case DisplayType.TEXTAREA:
      const textarea = (
        <ConfigInputTextArea
          key={sensitive ? key + '-sensitive-text-area' : key + 'text-area'}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

      return sensitive ? (
        <>
          <ConfigSensitiveTextArea
            isLoading={isLoading}
            configEntry={configEntry}
            validateAndSetConfigValue={validateAndSetConfigValue}
          />
        </>
      ) : (
        textarea
      );

    case DisplayType.TOGGLE:
      return (
        <ConfigSwitchField
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

    default:
      return sensitive ? (
        <ConfigInputPassword
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      ) : (
        <ConfigInputField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );
  }
};
