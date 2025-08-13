/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useEffect, useState } from 'react';

export function AdvancedConfigKeyInput({
  configKey,
  id,
  showLabel,
  onChange,
  checkIfAdvancedConfigKeyExists,
  checkIfPredefinedConfigKeyExists,
  addValidationError,
  removeValidationError,
}: {
  configKey: string;
  id: number;
  showLabel: boolean;
  onChange: (newKey: string) => void;
  checkIfAdvancedConfigKeyExists: (newKey: string, oldKey: string) => boolean;
  checkIfPredefinedConfigKeyExists: (key: string) => boolean;
  addValidationError: (key: string) => void;
  removeValidationError: (key: string) => void;
}) {
  // Handle key inputs with local state to avoid duplicated keys overwriting each other
  const [localKey, setLocalKey] = useState(configKey);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isFormInvalid = localKey !== configKey && Boolean(errorMsg);

  useEffect(() => {
    setLocalKey(configKey);
  }, [configKey]);

  const getErrorMsg = (newKey: string) => {
    if (newKey === '') {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyEmptyError', {
        defaultMessage: 'Key cannot be empty',
      });
    }
    if (checkIfPredefinedConfigKeyExists(newKey)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyPredefinedError', {
        defaultMessage: 'This key is already predefined in the standard configuration above',
      });
    }
    if (checkIfAdvancedConfigKeyExists(newKey, configKey)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyDuplicateError', {
        defaultMessage: 'This key is already used in another advanced configuration',
      });
    }
    return null;
  };

  const handleKeyChange = (newKey: string) => {
    const errorKey = `key${id}`;
    const formErrorMsg = getErrorMsg(newKey);

    setLocalKey(newKey);
    setErrorMsg(formErrorMsg);

    if (Boolean(formErrorMsg)) {
      addValidationError(errorKey);
    } else {
      removeValidationError(errorKey);
      onChange(newKey);
    }
  };

  return (
    <EuiFormRow
      label={
        showLabel
          ? i18n.translate('xpack.apm.agentConfig.settingsPage.keyLabel', { defaultMessage: 'key' })
          : undefined
      }
      error={errorMsg}
      isInvalid={isFormInvalid}
      fullWidth
    >
      <EuiFieldText
        data-test-subj="apmSettingsAdvancedConfigurationKeyField"
        aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.keyAriaLabel', {
          defaultMessage: 'Advanced configuration key',
        })}
        fullWidth
        value={localKey}
        isInvalid={isFormInvalid}
        onChange={(e) => handleKeyChange(e.target.value)}
      />
    </EuiFormRow>
  );
}
