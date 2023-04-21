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
  EuiSpacer,
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
      {localConfigView.map((configEntry, index) => {
        const {
          default_value: defaultValue,
          depends_on: dependencies,
          key,
          display,
          label,
          sensitive,
          tooltip,
          ui_restrictions: uiRestrictions,
        } = configEntry;

        if (uiRestrictions.length > 0) {
          return <></>;
        }

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
        // toggle and sensitive textarea labels go next to the element, not in the row
        const rowLabel =
          display === DisplayType.TOGGLE || (display === DisplayType.TEXTAREA && sensitive) ? (
            <></>
          ) : (
            <EuiToolTip content={tooltip}>
              <p>{label}</p>
            </EuiToolTip>
          );

        if (hasDependencies) {
          if (dependenciesSatisfied(dependencies, dependencyLookup)) {
            // dynamic spacing without CSS

            // finds the previous field that should appear above this field
            // ignores fields that are ui restricted or hidden due to not having dependencies met
            const previousField = localConfigView
              .slice(0, index)
              .reverse()
              .find(
                (x) =>
                  x.ui_restrictions.length <= 0 &&
                  (x.depends_on.length <= 0 ||
                    dependenciesSatisfied(x.depends_on, dependencyLookup))
              );
            // finds the next field that should appear below this field
            // ignores fields that are ui restricted or hidden due to not having dependencies met
            const nextField = localConfigView
              .slice(index + 1)
              .find(
                (x) =>
                  x.ui_restrictions.length <= 0 &&
                  (x.depends_on.length <= 0 ||
                    dependenciesSatisfied(x.depends_on, dependencyLookup))
              );

            // show top spacing if fields before are undefined (i.e. this field is first to render)
            // or the previous field has no dependencies
            const topSpacing =
              !previousField || previousField.depends_on.length <= 0 ? (
                <EuiSpacer size="m" />
              ) : (
                <></>
              );

            // show bottom spacing if fields after are undefined (i.e. this field is last to render)
            // or the next field has no dependencies
            const bottomSpacing =
              !nextField || nextField.depends_on.length <= 0 ? <EuiSpacer size="m" /> : <></>;

            return (
              <>
                {topSpacing}
                <EuiPanel color="subdued" borderRadius="none">
                  <EuiFormRow label={rowLabel} key={key} helpText={helpText}>
                    <ConnectorConfigurationField configEntry={configEntry} />
                  </EuiFormRow>
                </EuiPanel>
                {bottomSpacing}
              </>
            );
          } else {
            return <></>;
          }
        }

        return (
          <EuiFormRow label={rowLabel} key={key} helpText={helpText}>
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
