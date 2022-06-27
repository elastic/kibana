/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FunctionComponent } from 'react';

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

import { ResponseError } from '../../../../../../common/types';
import { DeprecationLoggingPreviewProps } from '../../../types';

import './_deprecation_logging_toggle.scss';

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
  errorLabel: i18n.translate('xpack.upgradeAssistant.overview.deprecationLogs.errorLabel', {
    defaultMessage: 'Error',
  }),
  buttonLabel: i18n.translate('xpack.upgradeAssistant.overview.deprecationLogs.buttonLabel', {
    defaultMessage: 'Enable deprecation log collection',
  }),
  loadingLogsLabel: i18n.translate('xpack.upgradeAssistant.overview.loadingLogsLabel', {
    defaultMessage: 'Loading deprecation log collection state…',
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
      {i18nTexts.errorLabel} {error.statusCode}
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

type Props = Pick<
  DeprecationLoggingPreviewProps,
  | 'isDeprecationLogIndexingEnabled'
  | 'isLoading'
  | 'isUpdating'
  | 'fetchError'
  | 'updateError'
  | 'resendRequest'
  | 'toggleLogging'
>;

export const DeprecationLoggingToggle: FunctionComponent<Props> = ({
  isDeprecationLogIndexingEnabled,
  isLoading,
  isUpdating,
  fetchError,
  updateError,
  resendRequest,
  toggleLogging,
}) => {
  if (isLoading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" className="upgToggleLoading">
        <EuiFlexItem grow={false} className="upgLoadingItem">
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{i18nTexts.loadingLogsLabel}</EuiFlexItem>
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
    <EuiFlexGroup gutterSize="m" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj="deprecationLoggingToggle"
          label={i18nTexts.buttonLabel}
          checked={!!isDeprecationLogIndexingEnabled}
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
