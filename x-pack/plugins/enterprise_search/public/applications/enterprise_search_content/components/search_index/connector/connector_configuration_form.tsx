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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { DependencyLookup, DisplayType } from '../../../../../../common/types/connectors';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';

import { ConnectorConfigurationField } from './connector_configuration_field';
import {
  ConfigEntry,
  ConnectorConfigurationLogic,
  dependenciesSatisfied,
} from './connector_configuration_logic';

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
        const {
          default_value: defaultValue,
          depends_on: dependencies,
          key,
          display,
          label,
          tooltip,
        } = configEntry;
        // toggle label goes next to the element, not in the row
        const hasDependencies = dependencies.length > 0;
        const helpText = defaultValue
          ? i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.config.defaultValue',
              {
                defaultMessage: 'If left empty, the default value {defaultValue} will be used.',
                values: { defaultValue },
              }
            )
          : '';
        const rowLabel =
          display !== DisplayType.TOGGLE ? (
            <EuiToolTip content={tooltip}>
              <p>{label}</p>
            </EuiToolTip>
          ) : (
            <></>
          );

        return hasDependencies ? (
          dependenciesSatisfied(dependencies, dependencyLookup) ? (
            <EuiPanel color="subdued" borderRadius="none">
              <EuiFormRow
                data-test-subj={`entSearchContent-connector-configuration-formrow-${key}`}
                label={rowLabel}
                key={key}
                helpText={helpText}
              >
                <ConnectorConfigurationField configEntry={configEntry} />
              </EuiFormRow>
            </EuiPanel>
          ) : (
            <></>
          )
        ) : (
          <EuiFormRow
            data-test-subj={`entSearchContent-connector-configuration-formrow-${key}`}
            label={rowLabel}
            key={key}
            helpText={helpText}
          >
            <ConnectorConfigurationField configEntry={configEntry} />
          </EuiFormRow>
        );
      })}
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="entSearchContent-connector-configuration-saveConfiguration"
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
