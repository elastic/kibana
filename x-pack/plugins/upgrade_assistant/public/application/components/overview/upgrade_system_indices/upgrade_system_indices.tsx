/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

const i18nTexts = {
  upgradeSystemIndicesTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeSystemIndicesTitle',
    {
      defaultMessage: 'Upgrade system indices',
    }
  ),
  upgradeSystemIndicesBody: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeSystemIndicesBody',
    {
      defaultMessage: 'Update system indices from kibana',
    }
  ),
  upgradeSystemIndicesButton: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeSystemIndicesBody',
    {
      defaultMessage: 'Upgrade',
    }
  ),
};

export const getUpgradeSystemIndicesStep = (): EuiStepProps => {
  return {
    title: i18nTexts.upgradeSystemIndicesTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.upgradeSystemIndicesBody}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiButton>{i18nTexts.upgradeSystemIndicesButton}</EuiButton>
      </>
    ),
  };
};
