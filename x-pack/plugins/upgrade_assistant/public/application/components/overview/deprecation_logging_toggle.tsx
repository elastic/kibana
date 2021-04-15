/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiSwitch, EuiLink, EuiFormRow, EuiButton, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SectionLoading } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { ResponseError } from '../../lib/api';

const i18nTexts = {
  fetchErrorMessage: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.fetchErrorMessage',
    {
      defaultMessage: 'Could not load logging state',
    }
  ),
  reloadButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.reloadButtonLabel',
    {
      defaultMessage: 'Reload',
    }
  ),
  toggleLabel: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.enabledLabel',
    {
      defaultMessage: 'Enable deprecation logging',
    }
  ),
  updateErrorMessage: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.updateErrorMessage',
    {
      defaultMessage: 'Could not update logging state',
    }
  ),
  enabledMessage: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.enabledToastMessage',
    {
      defaultMessage: 'Log deprecated actions.',
    }
  ),
  disabledMessage: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.disabledToastMessage',
    {
      defaultMessage: 'Do not log deprecated actions.',
    }
  ),
  loadingLabel: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.loadingText',
    {
      defaultMessage: 'Loading logging state…',
    }
  ),
  updatingLabel: i18n.translate(
    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.loadingText',
    {
      defaultMessage: 'Updating logging state…',
    }
  ),
  getDeprecationLoggingLabel: (href: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.deprecationLoggingDescription"
      defaultMessage="Log deprecated actions. {learnMore}"
      values={{
        learnMore: (
          <EuiLink href={href} target="_blank">
            {i18n.translate('xpack.upgradeAssistant.deprecationLoggingDescription.learnMoreLink', {
              defaultMessage: 'Learn more.',
            })}
          </EuiLink>
        ),
      }}
    />
  ),
};

export const DeprecationLoggingToggle: React.FunctionComponent = () => {
  const { api, notifications, docLinks } = useAppContext();

  const { data, error, isLoading, resendRequest } = api.useLoadDeprecationLogging();

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

  if (isLoading || isUpdating) {
    return (
      <SectionLoading inline>
        {isUpdating ? i18nTexts.updatingLabel : i18nTexts.loadingLabel}
      </SectionLoading>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        size="s"
        title={i18nTexts.fetchErrorMessage}
        iconType="alert"
        color="danger"
        data-test-subj="fetchLoggingError"
      >
        <EuiButton size="s" iconType="refresh" color="danger" onClick={resendRequest}>
          {i18nTexts.reloadButtonLabel}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (typeof isEnabled !== 'undefined') {
    return (
      <>
        {updateError && (
          <>
            <EuiCallOut
              data-test-subj="updateLoggingError"
              size="s"
              title={i18nTexts.updateErrorMessage}
              iconType="alert"
              color="danger"
            />
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFormRow
          helpText={i18nTexts.getDeprecationLoggingLabel(
            docLinks.links.elasticsearch.deprecationLogging
          )}
          data-test-subj="deprecationLoggingFormRow"
        >
          <EuiSwitch
            data-test-subj="upgradeAssistantDeprecationToggle"
            label={i18nTexts.toggleLabel}
            checked={isEnabled as boolean}
            onChange={toggleLogging}
          />
        </EuiFormRow>
      </>
    );
  }

  return null;
};
