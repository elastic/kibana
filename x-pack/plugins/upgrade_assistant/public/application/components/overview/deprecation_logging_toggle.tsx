/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../../app_context';
import { ResponseError } from '../../lib/api';

const i18nTexts = {
  fetchErrorMessage: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.fetchErrorMessage',
    {
      defaultMessage: 'Could not retrieve logging information.',
    }
  ),
  reloadButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.reloadButtonLabel',
    {
      defaultMessage: 'Try again',
    }
  ),
  updateErrorMessage: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.updateErrorMessage',
    {
      defaultMessage: 'Could not update logging state.',
    }
  ),
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
  fetchButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogging.loadingLabel',
    {
      defaultMessage: 'Retrieving logging state',
    }
  ),
  enablingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.enablingButtonLabel',
    {
      defaultMessage: 'Enabling deprecation logging',
    }
  ),
  disablingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.disablingButtonLabel',
    {
      defaultMessage: 'Disabling deprecation logging',
    }
  ),
  enableButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.enableButtonLabel',
    {
      defaultMessage: 'Enable deprecation logging',
    }
  ),
  disableButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.disableButtonLabel',
    {
      defaultMessage: 'Disable deprecation logging',
    }
  ),
  fetchErrorButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.fetchErrorButtonLabel',
    {
      defaultMessage: 'Deprecation logging unavailable',
    }
  ),
};

export const DeprecationLoggingToggle: React.FunctionComponent = () => {
  const { api, notifications } = useAppContext();

  const { data, error: fetchError, isLoading, resendRequest } = api.useLoadDeprecationLogging();

  const [isEnabled, setIsEnabled] = useState<boolean | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<ResponseError | undefined>(undefined);

  const getButtonLabel = () => {
    if (isLoading) {
      return i18nTexts.fetchButtonLabel;
    }

    if (isUpdating) {
      return isEnabled ? i18nTexts.disablingButtonLabel : i18nTexts.enablingButtonLabel;
    }

    if (fetchError) {
      return i18nTexts.fetchErrorButtonLabel;
    }

    if (isEnabled) {
      return i18nTexts.disableButtonLabel;
    }

    return i18nTexts.enableButtonLabel;
  };

  useEffect(() => {
    if (isLoading === false && data) {
      setIsEnabled(data.isEnabled);
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

    if (updateDeprecationError) {
      setUpdateError(updateDeprecationError);
    } else if (updatedLoggingState) {
      setIsEnabled(updatedLoggingState.isEnabled);
      notifications.toasts.addSuccess(
        updatedLoggingState.isEnabled ? i18nTexts.enabledMessage : i18nTexts.disabledMessage
      );
    }
  };

  return (
    <EuiFlexGroup alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="upgradeAssistantDeprecationToggle"
          isLoading={isLoading || isUpdating}
          onClick={toggleLogging}
          color={isEnabled ? 'text' : 'primary'}
          disabled={Boolean(fetchError)}
        >
          {getButtonLabel()}
        </EuiButton>
      </EuiFlexItem>

      {fetchError && (
        <EuiFlexItem>
          <EuiText>
            <p data-test-subj="fetchLoggingError">
              <EuiTextColor color="danger">{i18nTexts.fetchErrorMessage}</EuiTextColor>
              {fetchError.statusCode && fetchError.message && (
                <>
                  {' '}
                  <EuiTextColor color="danger">{`${fetchError.statusCode}: ${fetchError.message}`}</EuiTextColor>
                </>
              )}{' '}
              <EuiButtonEmpty iconType="refresh" onClick={resendRequest}>
                {i18nTexts.reloadButtonLabel}
              </EuiButtonEmpty>
            </p>
          </EuiText>
        </EuiFlexItem>
      )}

      {updateError && (
        <EuiFlexItem>
          <EuiText>
            <p data-test-subj="updateLoggingError">
              <EuiTextColor color="danger">{i18nTexts.updateErrorMessage}</EuiTextColor>
              {updateError.statusCode && updateError.message && (
                <>
                  {' '}
                  <EuiTextColor color="danger">{`${updateError.statusCode}: ${updateError.message}`}</EuiTextColor>
                </>
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
