/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiSwitch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiPopover,
  EuiLink,
  EuiTextColor,
  EuiButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../../../app_context';
import { ResponseError } from '../../../lib/api';

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
  buttonLabel: i18n.translate('xpack.upgradeAssistant.overview.deprecationLogs.buttonLabel', {
    defaultMessage: 'Collect deprecation logs',
  }),
};

const ErrorDetailsLink = ({ error }: { error: ResponseError }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  if (!error.statusCode || !error.message) {
    return null;
  }

  const button = (
    <EuiLink color="danger" onClick={onButtonClick}>
      Error {error.statusCode}
    </EuiLink>
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: 300 }}>
        <p>{error.message}</p>
      </EuiText>
    </EuiPopover>
  );
};

export const DeprecationLoggingToggle: React.FunctionComponent = () => {
  const { api, notifications } = useAppContext();

  const { data, error: fetchError, isLoading, resendRequest } = api.useLoadDeprecationLogging();

  const [isEnabled, setIsEnabled] = useState<boolean | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<ResponseError | undefined>(undefined);

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

  if (isLoading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>Loading log collection state...</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (fetchError) {
    return (
      <EuiFlexGroup gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="flexEnd" data-test-subj="fetchLoggingError">
            <EuiFlexItem grow={false}>
              <EuiTextColor color="danger">{i18nTexts.fetchErrorMessage}</EuiTextColor>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ErrorDetailsLink error={fetchError} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="refresh" onClick={resendRequest}>
            {i18nTexts.reloadButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj="upgradeAssistantDeprecationToggle"
          label={i18nTexts.buttonLabel}
          checked={!!isEnabled}
          onChange={toggleLogging}
          disabled={Boolean(fetchError) || isUpdating}
        />
      </EuiFlexItem>

      {updateError && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="flexEnd" data-test-subj="updateLoggingError">
            <EuiFlexItem grow={false}>
              <EuiTextColor color="danger">{i18nTexts.updateErrorMessage}</EuiTextColor>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ErrorDetailsLink error={updateError} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {isUpdating && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
