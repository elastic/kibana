/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useState } from 'react';

export function AdvancedConfigValueInput({
  configValue,
  configKey,
  id,
  showLabel,
  onChange,
  onDelete,
  addValidationError,
  removeValidationError,
}: {
  configValue: string;
  configKey: string;
  id: number;
  showLabel: boolean;
  onChange: ({ key, value }: { key: string; value: string }) => void;
  onDelete: (key: string, index: number) => void;
  addValidationError: (key: string) => void;
  removeValidationError: (key: string) => void;
}) {
  const [touched, setTouched] = useState(false);

  const isInvalidInput = (value: string) => {
    return value === '';
  };

  const handleValueChange = (value: string) => {
    const errorId = `value${id}`;

    setTouched(true);
    onChange({ key: configKey, value });

    if (isInvalidInput(value)) {
      addValidationError(errorId);
    } else {
      removeValidationError(errorId);
    }
  };

  return (
    <EuiFormRow
      label={
        showLabel
          ? i18n.translate('xpack.apm.agentConfig.settingsPage.valueLabel', {
              defaultMessage: 'value',
            })
          : undefined
      }
      error={i18n.translate('xpack.apm.agentConfig.settingsPage.valueEmptyError', {
        defaultMessage: 'Value cannot be empty',
      })}
      isInvalid={touched && isInvalidInput(configValue)}
      fullWidth
    >
      <EuiFieldText
        isInvalid={touched && isInvalidInput(configValue)}
        data-test-subj="apmSettingsAdvancedConfigurationValueField"
        aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.valueAriaLabel', {
          defaultMessage: 'Advanced configuration value',
        })}
        fullWidth
        value={configValue}
        onChange={(e) => handleValueChange(e.target.value)}
        append={
          <EuiButtonIcon
            data-test-subj="apmSettingsRemoveAdvancedConfigurationButton"
            aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.removeButtonAriaLabel', {
              defaultMessage: 'Remove advanced configuration',
            })}
            iconType="trash"
            color={'danger'}
            onClick={() => onDelete(configKey, id)}
          />
        }
      />
    </EuiFormRow>
  );
}
