/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiCallOut, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const i18nTexts = {
  calloutTitle: (warningsCount: number) =>
    i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.calloutTitle', {
      defaultMessage:
        '{warningsCount, plural, =0 {No} other {{warningsCount}}} deprecation {warningsCount, plural, one {warning} other {warnings}} since August 1, 2021 06:32PST',
      values: { warningsCount },
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

export const VerifyChanges: FunctionComponent = () => {
  const warningsCount = 1;
  const calloutTint = warningsCount > 0 ? 'warning' : 'success';

  return (
    <EuiCallOut
      title={i18nTexts.calloutTitle(warningsCount)}
      color={calloutTint}
      iconType={warningsCount > 0 ? 'alert' : 'check'}
      data-test-subj="verifyChangesCallout"
    >
      <p>{i18nTexts.calloutBody}</p>
      <EuiButton href="#" color={calloutTint}>
        {i18nTexts.resetCounterButton}
      </EuiButton>
    </EuiCallOut>
  );
};
