/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { WIZARD_STEPS } from '../step_types';

export const SkipValidationButton: FC<{
  nextActive: boolean;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}> = ({ nextActive, setCurrentStep }) =>
  nextActive ? null : (
    <EuiButtonEmpty
      onClick={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
      iconType="arrowRight"
      iconSide="right"
      data-test-subj="mlJobWizardNavButtonPrevious"
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.shopValidationButton"
        defaultMessage="Skip validation"
      />
    </EuiButtonEmpty>
  );
