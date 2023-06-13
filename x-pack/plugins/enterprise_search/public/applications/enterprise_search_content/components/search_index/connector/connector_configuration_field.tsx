/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiAccordion,
  EuiFieldText,
  EuiFieldPassword,
  EuiRadioGroup,
  EuiSelect,
  EuiSwitch,
  EuiTextArea,
  EuiToolTip,
} from '@elastic/eui';

import { Status } from '../../../../../../common/types/api';
import { DisplayType } from '../../../../../../common/types/connectors';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';

import {
  ConnectorConfigurationLogic,
  ConfigEntry,
  ensureStringType,
  ensureBooleanType,
} from './connector_configuration_logic';
import { DocumentLevelSecurityPanel } from './document_level_security/document_level_security_panel';

interface ConnectorConfigurationFieldProps {
  configEntry: ConfigEntry;
}

export const ConnectorConfigurationField: React.FC<ConnectorConfigurationFieldProps> = ({
  configEntry,
}) => {
  const { status } = useValues(ConnectorConfigurationApiLogic);
  const { setLocalConfigEntry } = useActions(ConnectorConfigurationLogic);

  const {
    key,
    display,
    is_valid: isValid,
    label,
    options,
    required,
    sensitive,
    tooltip,
    value,
  } = configEntry;

  switch (display) {
    case DisplayType.DROPDOWN:
      return options.length > 3 ? (
        <EuiSelect
          disabled={status === Status.LOADING}
          options={options.map((option) => ({ text: option.label, value: option.value }))}
          required={required}
          value={ensureStringType(value)}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      ) : (
        <EuiRadioGroup
          disabled={status === Status.LOADING}
          idSelected={ensureStringType(value)}
          name="radio group"
          options={options.map((option) => ({ id: option.value, label: option.label }))}
          onChange={(id) => {
            setLocalConfigEntry({ ...configEntry, value: id });
          }}
        />
      );

    case DisplayType.NUMERIC:
      return (
        <EuiFieldText
          disabled={status === Status.LOADING}
          required={required}
          value={ensureStringType(value)}
          isInvalid={!isValid}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      );

    case DisplayType.TEXTAREA:
      const textarea = (
        <EuiTextArea
          disabled={status === Status.LOADING}
          required={required}
          value={ensureStringType(value)}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      );

      return sensitive ? (
        <EuiAccordion
          id={key + '-accordion'}
          buttonContent={
            <EuiToolTip content={tooltip}>
              <p>{label}</p>
            </EuiToolTip>
          }
        >
          {textarea}
        </EuiAccordion>
      ) : (
        textarea
      );

    case DisplayType.TOGGLE:
      const toggleSwitch = (
        <EuiSwitch
          checked={ensureBooleanType(value)}
          disabled={status === Status.LOADING}
          label={
            <EuiToolTip content={tooltip}>
              <p>{label}</p>
            </EuiToolTip>
          }
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.checked });
          }}
        />
      );

      return key !== 'document_level_security' ? (
        toggleSwitch
      ) : (
        <DocumentLevelSecurityPanel toggleSwitch={toggleSwitch} />
      );

    default:
      return sensitive ? (
        <EuiFieldPassword
          disabled={status === Status.LOADING}
          required={required}
          type="dual"
          value={ensureStringType(value)}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      ) : (
        <EuiFieldText
          disabled={status === Status.LOADING}
          required={required}
          value={ensureStringType(value)}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      );
  }
};
