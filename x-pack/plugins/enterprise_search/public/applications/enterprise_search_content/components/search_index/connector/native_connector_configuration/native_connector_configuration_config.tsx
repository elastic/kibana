/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import { ConnectorConfiguration } from '../../../../../../../common/types/connectors';

import { NativeConnector } from '../types';

import { NativeConnectorConfigurationConfigLogic } from './native_connector_configuration_config_logic';

interface NativeConnectorConfigurationConfigProps {
  configuration: ConnectorConfiguration;
  nativeConnector: NativeConnector;
}

export const NativeConnectorConfigurationConfig: React.FC<
  NativeConnectorConfigurationConfigProps
> = ({ configuration: indexConfiguration, nativeConnector }) => {
  const nativeConfigurationKeys = Object.keys(nativeConnector.configuration);
  const { configuration, isEditing } = useValues(NativeConnectorConfigurationConfigLogic);
  const { saveConfiguration, setConfiguration } = useActions(
    NativeConnectorConfigurationConfigLogic
  );

  const configurationValues = isEditing ? configuration : indexConfiguration;

  return (
    <EuiForm
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        saveConfiguration();
      }}
    >
      <EuiFlexGroup direction="column">
        {nativeConfigurationKeys.map((key, index) => {
          return (
            <EuiFlexItem key={index}>
              <EuiFormRow label={nativeConnector.configuration[key]?.label}>
                <EuiFieldText
                  value={configurationValues[key]?.value}
                  onChange={(event) => {
                    const updatedConfiguration = {
                      ...nativeConnector.configuration,
                      ...configurationValues,
                      [key]: {
                        label: '',
                        ...nativeConnector.configuration[key],
                        ...configurationValues[key],
                        value: event.target.value,
                      },
                    };
                    setConfiguration(updatedConfiguration);
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          );
        })}
        <EuiFlexItem>
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title="Data source credentials are unencrypted"
          >
            <EuiText size="s">
              Encryption for data source credentials is unavailable in this technical preview. Your
              data source credentials will be stored, unencrypted, in Elasticsearch.
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink target="_blank" href={'' /* TODO needs link */}>
            {nativeConnector.name} authentication
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton type="submit" disabled={!isEditing}>
                Save configuration
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
