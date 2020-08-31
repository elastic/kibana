/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const continueButtonText = i18n.translate(
  'xpack.ml.dataframe.analytics.creation.continueButtonText',
  {
    defaultMessage: 'Continue',
  }
);

export const ContinueButton: FC<{ isDisabled: boolean; onClick: any }> = ({
  isDisabled,
  onClick,
}) => (
  <EuiFlexGroup>
    <EuiFlexItem grow={false}>
      <EuiButton
        data-test-subj="mlAnalyticsCreateJobWizardContinueButton"
        isDisabled={isDisabled}
        size="s"
        onClick={onClick}
      >
        {continueButtonText}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
