/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

const i18nTexts = {
  upgradeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepTitle', {
    defaultMessage: 'Check back here when it's time to upgrade to 8.x',
  }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage: `If you've resolved all critical issues and checked your deprecation logs, you're ready for the next major version of Elastic. Check this page again before upgrading to Elastic 8.x.`,
  }),
};

export const getUpgradeStep = (): EuiStepProps => {
  return {
    title: i18nTexts.upgradeStepTitle,
    status: 'incomplete',
    'data-test-subj': 'upgradeStep',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.upgradeStepDescription}</p>
        </EuiText>

        <EuiSpacer size="m" />
      </>
    ),
  };
};
