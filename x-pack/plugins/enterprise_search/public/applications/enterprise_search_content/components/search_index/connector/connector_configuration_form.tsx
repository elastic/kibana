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
import { DisplayType } from '../../../../../../common/types/connectors';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';

import { ConnectorConfigurationField } from './connector_configuration_field';
import { ConnectorConfigurationLogic } from './connector_configuration_logic';

export const ConnectorConfigurationForm = () => {
  const { status } = useValues(ConnectorConfigurationApiLogic);

  const { localConfigView } = useValues(ConnectorConfigurationLogic);
  const { saveConfig, setIsEditing } = useActions(ConnectorConfigurationLogic);

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
          is_valid: isValid,
          label,
          sensitive,
          tooltip,
          validation_errors: validationErrors,
        } = configEntry;
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

        if (dependencies?.length > 0) {
          // dynamic spacing without CSS
          const previousField = localConfigView[index - 1];
          const nextField = localConfigView[index + 1];

          const topSpacing =
            !previousField || previousField.depends_on.length <= 0 ? <EuiSpacer size="m" /> : <></>;

          const bottomSpacing =
            !nextField || nextField.depends_on.length <= 0 ? <EuiSpacer size="m" /> : <></>;

          return (
            <>
              {topSpacing}
              <EuiPanel color="subdued" borderRadius="none">
                <EuiFormRow
                  label={rowLabel}
                  key={key}
                  helpText={helpText}
                  error={validationErrors}
                  isInvalid={!isValid}
                  data-test-subj={`entSearchContent-connector-configuration-formrow-${key}`}
                >
                  <ConnectorConfigurationField configEntry={configEntry} />
                </EuiFormRow>
              </EuiPanel>
              {bottomSpacing}
            </>
          );
        }

        return (
          <EuiFormRow
            label={rowLabel}
            key={key}
            helpText={helpText}
            error={validationErrors}
            isInvalid={!isValid}
            data-test-subj={`entSearchContent-connector-configuration-formrow-${key}`}
          >
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
