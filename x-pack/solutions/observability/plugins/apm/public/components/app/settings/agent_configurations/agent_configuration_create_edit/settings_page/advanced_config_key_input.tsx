/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
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
  onChange,
  checkIfAdvancedConfigKeyExists,
  checkIfPredefinedConfigKeyExists,
  addValidationError,
  removeValidationError,
}: {
  configKey: string;
  id: number;
  showLabel: boolean;
  onChange: ({ key, oldKey }: { key: string; oldKey: string }) => void;
  checkIfAdvancedConfigKeyExists: (key: string) => boolean;
  checkIfPredefinedConfigKeyExists: (key: string) => boolean;
  addValidationError: (key: string) => void;
  removeValidationError: (key: string) => void;
}) {
  // Handle key inputs with local state to avoid duplicated keys overwriting each other
  const [localKey, setLocalKey] = useState(configKey);

  useEffect(() => {
    setLocalKey(configKey);
  }, [configKey]);

  const errorType = useMemo(() => {
    if (localKey === '') {
      return ErrorType.Empty;
    }
    if (checkIfPredefinedConfigKeyExists(localKey)) {
      return ErrorType.AlreadyPredefined;
    }
    if (checkIfAdvancedConfigKeyExists(localKey)) {
      return ErrorType.Duplicated;
    }
    return ErrorType.None;
  }, [localKey, checkIfPredefinedConfigKeyExists, checkIfAdvancedConfigKeyExists]);

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

  const isKeyChanged = useMemo(() => localKey !== configKey, [localKey, configKey]);

  const isFormInvalid = useMemo(
    () => isKeyChanged && errorType !== ErrorType.None,
    [isKeyChanged, errorType]
  );

  useEffect(() => {
    const errorId = `key${id}`;

    if (isFormInvalid) {
      addValidationError(errorId);
    } else {
      removeValidationError(errorId);

      if (isKeyChanged) {
        onChange({ key: localKey, oldKey: configKey });
      }
    }
  }, [
    id,
    addValidationError,
    removeValidationError,
    localKey,
    configKey,
    onChange,
    isFormInvalid,
    isKeyChanged,
  ]);

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
        onChange={(e) => setLocalKey(e.target.value)}
      />
    </EuiFormRow>
  );
}
