/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useEffect, useState } from 'react';

export function AdvancedConfigKeyInput({
  configKey,
  id,
  showLabel,
  revalidate,
  onChange,
  checkIfAdvancedConfigKeyExists,
  checkIfPredefinedConfigKeyExists,
  addValidationError,
  removeValidationError,
}: {
  configKey: string;
  id: number;
  showLabel: boolean;
  revalidate: boolean;
  onChange: ({ key, oldKey }: { key: string; oldKey: string }) => void;
  checkIfAdvancedConfigKeyExists: (key: string) => boolean;
  checkIfPredefinedConfigKeyExists: (key: string) => boolean;
  addValidationError: (key: string, active: boolean) => void;
  removeValidationError: (key: string) => void;
}) {
  // Handle key inputs with local state to avoid duplicated keys overwriting each other
  const [localKey, setLocalKey] = useState(configKey);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFormInvalid, setIsFormInvalid] = useState(false);

  useEffect(() => {
    setLocalKey(configKey);
  }, [configKey]);

  const [touched, setTouched] = useState(false);

  const getErrorMsg = useCallback(
    (key: string) => {
      if (key === '') {
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyEmptyError', {
          defaultMessage: 'Key cannot be empty',
        });
      }
      if (key.trim() === '') {
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyEmptyError', {
          defaultMessage: 'Key cannot be only whitespace characters',
        });
      }
      if (checkIfPredefinedConfigKeyExists(key)) {
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyPredefinedError', {
          defaultMessage: 'This key is already predefined in the standard configuration above',
        });
      }
      if (key !== configKey && checkIfAdvancedConfigKeyExists(key)) {
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyDuplicateError', {
          defaultMessage: 'This key is already used in another advanced configuration',
        });
      }
      return null;
    },
    [checkIfAdvancedConfigKeyExists, checkIfPredefinedConfigKeyExists, configKey]
  );

  useEffect(() => {
    const errorId = `key${id}`;
    const newErrorMsg = getErrorMsg(localKey);
    const hasValidationErrors = newErrorMsg !== null;

    setErrorMsg(newErrorMsg);
    setIsFormInvalid((touched || revalidate) && hasValidationErrors);

    if (hasValidationErrors) {
      addValidationError(errorId, touched);
    } else {
      removeValidationError(errorId);
    }
  }, [id, addValidationError, removeValidationError, touched, localKey, revalidate, getErrorMsg]);

  const handleKeyChange = (key: string) => {
    const newErrorMsg = getErrorMsg(key);
    const noValidationErrors = newErrorMsg === null;

    setLocalKey(key);
    setTouched(true);

    if (noValidationErrors) {
      onChange({ key, oldKey: configKey });
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
