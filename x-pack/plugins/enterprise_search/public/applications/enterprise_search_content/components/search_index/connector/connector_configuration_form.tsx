/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';

import { ConnectorConfigurationLogic } from './connector_configuration_logic';

export const ConnectorConfigurationForm = () => {
  const { status } = useValues(ConnectorConfigurationApiLogic);

  const { localConfigView } = useValues(ConnectorConfigurationLogic);
  const { saveConfig, setIsEditing, setLocalConfigEntry } = useActions(ConnectorConfigurationLogic);

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveConfig();
      }}
      component="form"
    >
      {localConfigView.map(({ key, label, value }) => (
        <EuiFormRow label={label ?? ''} key={key}>
          <EuiFieldText
            value={value}
            disabled={status === Status.LOADING}
            onChange={(event) => {
              setLocalConfigEntry({ key, label, value: event.target.value });
            }}
          />
        </EuiFormRow>
      ))}
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id="entSearchContent-connector-configuration-saveConfiguration"
              type="submit"
              isLoading={status === Status.LOADING}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.submitButton.title',
                {
                  defaultMessage: 'Save configuration',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id="entSearchContent-connector-configuration-cancelEdit"
              isDisabled={status === Status.LOADING}
              onClick={() => {
                setIsEditing(false);
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.cancelEditingButton.title',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
