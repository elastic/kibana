/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useEffect, useState } from 'react';

enum ErrorType {
  None,
  Empty,
  AlreadyPredefined,
  Duplicated,
}

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
  const [errorType, setErrorType] = useState<ErrorType>(ErrorType.None);
  const [isFormInvalid, setIsFormInvalid] = useState(false);

  useEffect(() => {
    setLocalKey(configKey);
  }, [configKey]);

  const touched = useCallback((key: string) => key !== configKey, [configKey]);

  const getErrorType = useCallback(
    (key: string) => {
      if (key === '') {
        return ErrorType.Empty;
      }
      if (checkIfPredefinedConfigKeyExists(key)) {
        return ErrorType.AlreadyPredefined;
      }
      if (touched(key) && checkIfAdvancedConfigKeyExists(key)) {
        return ErrorType.Duplicated;
      }
      return ErrorType.None;
    },
    [checkIfAdvancedConfigKeyExists, checkIfPredefinedConfigKeyExists, touched]
  );

  const errorMsg = useMemo(() => {
    switch (errorType) {
      case ErrorType.Empty:
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyEmptyError', {
          defaultMessage: 'Key cannot be empty',
        });
      case ErrorType.AlreadyPredefined:
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyPredefinedError', {
          defaultMessage: 'This key is already predefined in the standard configuration above',
        });
      case ErrorType.Duplicated:
        return i18n.translate('xpack.apm.agentConfig.settingsPage.keyDuplicateError', {
          defaultMessage: 'This key is already used in another advanced configuration',
        });
      default:
        return '';
    }
  }, [errorType]);

  useEffect(() => {
    const errorId = `key${id}`;
    const isTouched = touched(localKey);
    const newErrorType = getErrorType(localKey);
    const hasValidationErrors = newErrorType !== ErrorType.None;

    setErrorType(newErrorType);
    setIsFormInvalid((isTouched || revalidate) && hasValidationErrors);

    if (hasValidationErrors) {
      addValidationError(errorId, isTouched);
    } else {
      removeValidationError(errorId);
    }
  }, [id, addValidationError, removeValidationError, touched, localKey, revalidate, getErrorType]);

  const handleKeyChange = (key: string) => {
    const newErrorType = getErrorType(key);
    const noValidationErrors = newErrorType === ErrorType.None;

    setLocalKey(key);
    setErrorType(newErrorType);

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
