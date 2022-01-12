/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import moment from 'moment-timezone';
import { FormattedDate, FormattedTime, FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiButton, EuiLoadingContent } from '@elastic/eui';

import { useAppContext } from '../../../../app_context';
import { uiMetricService, UIM_RESET_LOGS_COUNTER_CLICK } from '../../../../lib/ui_metric';

const i18nTexts = {
  calloutTitle: (warningsCount: number, previousCheck: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.verifyChanges.calloutTitle"
      defaultMessage="{warningsCount, plural, =0 {No} other {{warningsCount}}} deprecation {warningsCount, plural, one {issue} other {issues}} since {previousCheck}"
      values={{
        warningsCount,
        previousCheck: (
          <>
            <FormattedDate value={previousCheck} year="numeric" month="long" day="2-digit" />{' '}
            <FormattedTime value={previousCheck} timeZoneName="short" hour12={false} />
          </>
        ),
      }}
    />
  ),
  calloutBody: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.calloutBody', {
    defaultMessage: `After making changes, reset the counter and continue monitoring to verify you're no longer using deprecated features.`,
  }),
  loadingError: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.loadingError', {
    defaultMessage: 'An error occurred while retrieving the count of deprecation logs',
  }),
  retryButton: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.retryButton', {
    defaultMessage: 'Try again',
  }),
  resetCounterButton: i18n.translate(
    'xpack.upgradeAssistant.overview.verifyChanges.resetCounterButton',
    {
      defaultMessage: 'Reset counter',
    }
  ),
  errorToastTitle: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.errorToastTitle', {
    defaultMessage: 'Could not delete deprecation logs cache',
  }),
};

interface Props {
  checkpoint: string;
  setCheckpoint: (value: string) => void;
}

export const DeprecationsCountCheckpoint: FunctionComponent<Props> = ({
  checkpoint,
  setCheckpoint,
}) => {
  const [isDeletingCache, setIsDeletingCache] = useState(false);
  const {
    services: {
      api,
      core: { notifications },
    },
  } = useAppContext();
  const { data, error, isLoading, resendRequest, isInitialRequest } =
    api.getDeprecationLogsCount(checkpoint);

  const logsCount = data?.count || 0;
  const hasLogs = logsCount > 0;
  const calloutTint = hasLogs ? 'warning' : 'success';
  const calloutIcon = hasLogs ? 'alert' : 'check';
  const calloutTestId = hasLogs ? 'hasWarningsCallout' : 'noWarningsCallout';

  const onResetClick = async () => {
    setIsDeletingCache(true);
    const { error: deleteLogsCacheError } = await api.deleteDeprecationLogsCache();
    setIsDeletingCache(false);

    if (deleteLogsCacheError) {
      notifications.toasts.addDanger({
        title: i18nTexts.errorToastTitle,
        text: deleteLogsCacheError.message.toString(),
      });
      return;
    }

    const now = moment().toISOString();
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_RESET_LOGS_COUNTER_CLICK);
    setCheckpoint(now);
  };

  if (isInitialRequest && isLoading) {
    return <EuiLoadingContent lines={6} />;
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="alert"
        data-test-subj="errorCallout"
      >
        <p>
          {error.statusCode} - {error.message}
        </p>
        <EuiButton color="danger" onClick={resendRequest} data-test-subj="retryButton">
          {i18nTexts.retryButton}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18nTexts.calloutTitle(logsCount, checkpoint)}
      color={calloutTint}
      iconType={calloutIcon}
      data-test-subj={calloutTestId}
    >
      <p>{i18nTexts.calloutBody}</p>
      <EuiButton
        color={calloutTint}
        onClick={onResetClick}
        isLoading={isDeletingCache || isLoading}
        data-test-subj="resetLastStoredDate"
      >
        {i18nTexts.resetCounterButton}
      </EuiButton>
    </EuiCallOut>
  );
};
