/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow, EuiPanel, EuiSpacer, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DisplayType } from '../../../../../../../common/types/connectors';

import { ConnectorConfigurationField } from '../connector_configuration_field';
import { ConfigEntry } from '../connector_configuration_logic';

interface ConnectorConfigurationFormItemsProps {
  hasDocumentLevelSecurityEnabled: boolean;
  items: ConfigEntry[];
}

export const ConnectorConfigurationFormItems: React.FC<ConnectorConfigurationFormItemsProps> = ({
  items,
  hasDocumentLevelSecurityEnabled,
}) => {
  return (
    <>
      <EuiSpacer />
      {items.map((configEntry, index) => {
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

        if (key === 'document_level_security' && !hasDocumentLevelSecurityEnabled) {
          return null;
        }

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
          const previousField = items[index - 1];
          const nextField = items[index + 1];

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
    </>
  );
};
