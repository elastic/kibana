/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import moment from 'moment-timezone';
import useInterval from 'react-use/lib/useInterval';

import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiButton } from '@elastic/eui';
import { useAppContext } from '../../../../app_context';
import { Storage } from '../../../../../shared_imports';
import { DEPRECATION_WARNINGS_POLLING_INTERVAL } from '../../../constants';

const DEPRECATION_WARNINGS_KEY = 'kibana.upgradeAssistant.lastPollingCheck';
const localStorage = new Storage(window.localStorage);

const i18nTexts = {
  calloutTitle: (warningsCount: number, previousCheck: string) =>
    i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.calloutTitle', {
      defaultMessage:
        '{warningsCount, plural, =0 {No} other {{warningsCount}}} deprecation {warningsCount, plural, one {warning} other {warnings}} since {previousCheck}',
      values: { warningsCount, previousCheck },
    }),
  calloutBody: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.calloutBody', {
    defaultMessage:
      'Reset the counter after making changes and continue monitoring to verify that you are no longer using deprecated APIs.',
  }),
  resetCounterButton: i18n.translate(
    'xpack.upgradeAssistant.overview.verifyChanges.resetCounterButton',
    {
      defaultMessage: 'Reset counter',
    }
  ),
};

const getPreviousCheck = () => {
  const lastStoredValue = moment(localStorage.get(DEPRECATION_WARNINGS_KEY));

  if (lastStoredValue.isValid()) {
    return lastStoredValue.toISOString();
  }

  const now = moment().toISOString();
  localStorage.set(DEPRECATION_WARNINGS_KEY, now);

  return now;
};

const getFormattedDate = (date: string) => {
  const withFormat = 'MMMM DD, YYYY HH:mm';

  return `${moment(date).format(withFormat)} ${moment.tz.guess()}`;
};

export const VerifyChanges: FunctionComponent = () => {
  const { api } = useAppContext();
  const [previousCheck, setPreviousCheck] = useState(getPreviousCheck());
  const { data, error, isLoading, resendRequest } = api.getDeprecationLogsCount(previousCheck);

  const warningsCount = data?.count || 0;
  const calloutTint = warningsCount > 0 ? 'warning' : 'success';
  const calloutIcon = warningsCount > 0 ? 'alert' : 'check';

  useInterval(() => {
    resendRequest();
  }, DEPRECATION_WARNINGS_POLLING_INTERVAL);

  const onResetClick = () => {
    const now = moment().toISOString();

    setPreviousCheck(now);
    localStorage.set(DEPRECATION_WARNINGS_KEY, now);
  };

  return (
    <EuiCallOut
      title={i18nTexts.calloutTitle(warningsCount, getFormattedDate(previousCheck))}
      color={calloutTint}
      iconType={calloutIcon}
      data-test-subj="verifyChangesCallout"
    >
      <p>{i18nTexts.calloutBody}</p>
      <EuiButton color={calloutTint} onClick={onResetClick}>
        {i18nTexts.resetCounterButton}
      </EuiButton>
    </EuiCallOut>
  );
};
