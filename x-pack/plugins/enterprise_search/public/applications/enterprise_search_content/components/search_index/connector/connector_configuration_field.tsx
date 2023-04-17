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
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';

import { Status } from '../../../../../../common/types/api';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';

import {
  ConnectorConfigurationLogic,
  ConfigEntry,
  ensureStringType,
  ensureNumberType,
  ensureBooleanType,
} from './connector_configuration_logic';

interface ConnectorConfigurationFieldProps {
  configEntry: ConfigEntry;
}

export const ConnectorConfigurationField: React.FC<ConnectorConfigurationFieldProps> = ({
  configEntry,
}) => {
  const { status } = useValues(ConnectorConfigurationApiLogic);
  const { setLocalConfigEntry } = useActions(ConnectorConfigurationLogic);

  const { key, display, label, sensitive, value } = configEntry;

  switch (display) {
    case 'textarea':
      const textarea = (
        <EuiTextArea
          value={ensureStringType(value)}
          disabled={status === Status.LOADING}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      );

      return sensitive ? (
        <EuiAccordion id={key + '-accordion'} buttonContent={label}>
          {textarea}
        </EuiAccordion>
      ) : (
        textarea
      );

    case 'numeric':
      return (
        <EuiFieldNumber
          value={ensureNumberType(value)}
          disabled={status === Status.LOADING}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      );

    case 'toggle':
      return (
        <EuiSwitch
          checked={ensureBooleanType(value)}
          disabled={status === Status.LOADING}
          label={label}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.checked });
          }}
        />
      );

    default:
      return sensitive ? (
        <EuiFieldPassword
          value={ensureStringType(value)}
          disabled={status === Status.LOADING}
          type="dual"
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      ) : (
        <EuiFieldText
          value={ensureStringType(value)}
          disabled={status === Status.LOADING}
          onChange={(event) => {
            setLocalConfigEntry({ ...configEntry, value: event.target.value });
          }}
        />
      );
  }
};
