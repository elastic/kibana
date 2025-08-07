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
  index,
  setValidationErrors,
  onChange,
  checkIfAdvancedConfigKeyExists,
  checkIfPredefinedConfigKeyExists,
}: {
  configKey: string;
  index: number;
  setValidationErrors: React.Dispatch<React.SetStateAction<string[]>>;
  onChange: (newKey: string) => void;
  checkIfAdvancedConfigKeyExists: (newKey: string, oldKey: string) => boolean;
  checkIfPredefinedConfigKeyExists: (key: string) => boolean;
}) {
  // Handle key inputs with local state to avoid duplicated keys overwriting each other
  const [localKey, setLocalKey] = useState(configKey);
  const touched = localKey !== configKey;

  useEffect(() => {
    setLocalKey(configKey);
  }, [configKey]);

  const isInvalidInput = (key: string) => {
    return (
      key === '' ||
      checkIfPredefinedConfigKeyExists(key) ||
      checkIfAdvancedConfigKeyExists(key, configKey)
    );
  };

  const getKeyValidationError = (key: string) => {
    if (key === '') {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyEmptyError', {
        defaultMessage: 'Key cannot be empty',
      });
    }
    if (checkIfPredefinedConfigKeyExists(key)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyPredefinedError', {
        defaultMessage: 'This key is already predefined in the standard configuration above',
      });
    }
    if (checkIfAdvancedConfigKeyExists(key, configKey)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyDuplicateError', {
        defaultMessage: 'This key is already used in another advanced configuration',
      });
    }
    return null;
  };

  const handleKeyChange = (newKey: string) => {
    setLocalKey(newKey);
    const errorKey = `key${index}`;

    if (isInvalidInput(newKey)) {
      setValidationErrors((prev) => (prev.includes(errorKey) ? prev : [...prev, errorKey]));
    } else {
      setValidationErrors((prev) => prev.filter((error) => error !== errorKey));
      onChange(newKey);
    }
  };

  return (
    <EuiFormRow
      label={
        index === 0
          ? i18n.translate('xpack.apm.agentConfig.settingsPage.keyLabel', {
              defaultMessage: 'key',
            })
          : undefined
      }
      error={getKeyValidationError(localKey)}
      isInvalid={touched && isInvalidInput(localKey)}
      fullWidth
    >
      <EuiFieldText
        data-test-subj="apmSettingsAdvancedConfigurationKeyField"
        aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.keyAriaLabel', {
          defaultMessage: 'Advanced configuration key',
        })}
        fullWidth
        value={localKey}
        isInvalid={touched && isInvalidInput(localKey)}
        onChange={(e) => handleKeyChange(e.target.value)}
      />
    </EuiFormRow>
  );
}
