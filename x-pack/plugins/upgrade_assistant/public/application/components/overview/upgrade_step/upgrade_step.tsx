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
    defaultMessage: 'Get ready for the next version of Elastic',
  }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage:
      'You can start resolving all critical issues in preparation for the upcoming Elastic 8.x. Be sure to back up your data again before upgrading',
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
