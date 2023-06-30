/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DisplayType } from '../../../../../../common/types/connectors';

import { ConnectorConfigurationField } from './connector_configuration_field';
import { ConfigEntryView } from './connector_configuration_logic';

interface ConnectorConfigurationFormItemsProps {
  hasDocumentLevelSecurityEnabled: boolean;
  items: ConfigEntryView[];
}

export const ConnectorConfigurationFormItems: React.FC<ConnectorConfigurationFormItemsProps> = ({
  items,
  hasDocumentLevelSecurityEnabled,
}) => {
  return (
    <EuiFlexGroup direction="column">
      {items.map((configEntry) => {
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

        if (key === 'use_document_level_security' && !hasDocumentLevelSecurityEnabled) {
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
          ) : tooltip ? (
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <p>{label}</p>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="questionInCircle" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <p>{label}</p>
          );

        if (dependencies?.length > 0) {
          return (
            <EuiFlexItem key={key}>
              <EuiPanel color="subdued" borderRadius="none">
                <EuiToolTip content={tooltip}>
                  <EuiFormRow
                    label={rowLabel}
                    helpText={helpText}
                    error={validationErrors}
                    isInvalid={!isValid}
                    data-test-subj={`entSearchContent-connector-configuration-formrow-${key}`}
                  >
                    <ConnectorConfigurationField configEntry={configEntry} />
                  </EuiFormRow>
                </EuiToolTip>
              </EuiPanel>
            </EuiFlexItem>
          );
        }
        return (
          <EuiFlexItem key={key}>
            <EuiToolTip content={tooltip}>
              <EuiFormRow
                label={rowLabel}
                helpText={helpText}
                error={validationErrors}
                isInvalid={!isValid}
                data-test-subj={`entSearchContent-connector-configuration-formrow-${key}`}
              >
                <ConnectorConfigurationField configEntry={configEntry} />
              </EuiFormRow>
            </EuiToolTip>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
