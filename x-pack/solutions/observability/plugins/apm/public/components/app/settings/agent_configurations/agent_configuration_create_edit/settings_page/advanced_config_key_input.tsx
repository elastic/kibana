/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useCallback, useEffect, useState } from 'react';

export function AdvancedConfigKeyInput({
  configKey,
  configValue,
  index,
  predefinedAgentConfigKeys,
  unknownAgentConfigs,
  setValidationErrors,
  onUpdate,
}: {
  configKey: string;
  configValue: string;
  index: number;
  predefinedAgentConfigKeys: string[];
  unknownAgentConfigs: Array<[string, string]>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onUpdate: (oldKey: string, newKey: string, value: string) => void;
}) {
  // Handle key inputs with local state to avoid duplicated keys overwriting each other
  const [localKey, setLocalKey] = useState(configKey);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setLocalKey(configKey);
  }, [configKey]);

  const checkIfAdvancedConfigKeyExists = useCallback(
    (key: string) => {
      return unknownAgentConfigs.some(
        ([unknownConfigKey], unknownConfigIndex) =>
          unknownConfigKey === key && unknownConfigIndex !== index
      );
    },
    [unknownAgentConfigs, index]
  );

  const checkIfPredefinedConfigKeyExists = useCallback(
    (key: string) => {
      return predefinedAgentConfigKeys.includes(key);
    },
    [predefinedAgentConfigKeys]
  );

  const isInvalidInput = (key: string) => {
    return (
      key === '' || checkIfPredefinedConfigKeyExists(key) || checkIfAdvancedConfigKeyExists(key)
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
    if (checkIfAdvancedConfigKeyExists(key)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyDuplicateError', {
        defaultMessage: 'This key is already used in another advanced configuration',
      });
    }
    return null;
  };

  const handleKeyChange = (newKey: string) => {
    setTouched(true);
    setLocalKey(newKey);
    setValidationErrors((prev) => ({
      ...prev,
      [`key${index}`]: isInvalidInput(newKey),
    }));
    // Skip updating if key already exists to prevent overwriting existing values, it gives users chance to correct the key
    // e.g. { keyName: 1, keyName: 2 } => { keyName: 2 }
    if (!checkIfPredefinedConfigKeyExists(newKey) && !checkIfAdvancedConfigKeyExists(newKey)) {
      onUpdate(configKey, newKey, configValue);
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
