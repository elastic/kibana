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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { DependencyLookup } from '../../../../../../common/types/connectors';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';

import { ConnectorConfigurationField } from './connector_configuration_field';
import {
  ConfigEntry,
  ConnectorConfigurationLogic,
  dependenciesSatisfied,
} from './connector_configuration_logic';

import './connector_configuration_form.scss';

export const ConnectorConfigurationForm = () => {
  const { status } = useValues(ConnectorConfigurationApiLogic);

  const { localConfigView } = useValues(ConnectorConfigurationLogic);
  const { saveConfig, setIsEditing } = useActions(ConnectorConfigurationLogic);

  const dependencyLookup: DependencyLookup = localConfigView.reduce(
    (prev: Record<string, string | number | boolean | null>, configEntry: ConfigEntry) => ({
      ...prev,
      [configEntry.key]: configEntry.value,
    }),
    {}
  );

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveConfig();
      }}
      component="form"
    >
      {localConfigView.map((configEntry) => {
        const { depends_on: dependencies, key, label } = configEntry;
        const hasDependencies = dependencies.length > 0;

        return hasDependencies ? (
          dependenciesSatisfied(dependencies, dependencyLookup) ? (
            <EuiPanel color="subdued" borderRadius="none">
              <EuiFormRow label={label ?? ''} key={key}>
                <ConnectorConfigurationField configEntry={configEntry} />
              </EuiFormRow>
            </EuiPanel>
          ) : (
            <></>
          )
        ) : (
          <EuiFormRow label={label ?? ''} key={key}>
            <ConnectorConfigurationField configEntry={configEntry} />
          </EuiFormRow>
        );
      })}
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
