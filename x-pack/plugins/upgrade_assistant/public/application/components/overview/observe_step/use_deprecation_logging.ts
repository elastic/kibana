/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import { useAppContext } from '../../../app_context';
import { ResponseError } from '../../../lib/api';
import { DeprecationLoggingPreviewProps } from '../../types';

const i18nTexts = {
  enabledMessage: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.enabledToastMessage',
    {
      defaultMessage: 'Log deprecated actions.',
    }
  ),
  disabledMessage: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.disabledToastMessage',
    {
      defaultMessage: 'Do not log deprecated actions.',
    }
  ),
};

export const useDeprecationLogging = (): DeprecationLoggingPreviewProps => {
  const { api, notifications } = useAppContext();
  const { data, error: fetchError, isLoading, resendRequest } = api.useLoadDeprecationLogging();

  const [isEnabled, setIsEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasLoggerDeprecationWarning, setLoggerDeprecationWarning] = useState(false);
  const [updateError, setUpdateError] = useState<ResponseError | undefined>();

  useEffect(() => {
    if (isLoading === false && data) {
      setIsEnabled(data.isEnabled);

      if (!data?.isEnabled && data?.isLoggerDeprecationEnabled) {
        setLoggerDeprecationWarning(true);
      }
    }
  }, [data, isLoading]);

  const toggleLogging = async () => {
    const newIsEnabledValue = !isEnabled;

    setIsUpdating(true);

    const {
      data: updatedLoggingState,
      error: updateDeprecationError,
    } = await api.updateDeprecationLogging({
      isEnabled: newIsEnabledValue,
    });

    setIsUpdating(false);
    setLoggerDeprecationWarning(false);

    if (updateDeprecationError) {
      setUpdateError(updateDeprecationError);
    } else if (updatedLoggingState) {
      setIsEnabled(updatedLoggingState.isEnabled);
      notifications.toasts.addSuccess(
        updatedLoggingState.isEnabled ? i18nTexts.enabledMessage : i18nTexts.disabledMessage
      );
    }
  };

  return {
    isEnabled,
    isLoading: isLoading || isUpdating,
    isUpdating,
    toggleLogging,
    fetchError,
    updateError,
    resendRequest,
    hasLoggerDeprecationWarning,
  };
};
