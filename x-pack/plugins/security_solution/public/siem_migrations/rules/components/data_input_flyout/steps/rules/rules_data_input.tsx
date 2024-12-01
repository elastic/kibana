/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStepNumber,
  EuiSteps,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { SubStepWrapper } from '../common/sub_step_wrapper';
import * as i18n from './translations';
import { CopyExportQuery } from './sub_steps/copy_export_query';
import { RulesFileUpload } from './sub_steps/rules_file_upload';

type Step = 1 | 2 | 3;
const getStatus = (step: Step, currentStep: Step): EuiStepStatus => {
  if (step === currentStep) {
    return 'current';
  }
  if (step < currentStep) {
    return 'complete';
  }
  return 'incomplete';
};

export const RulesDataInput = React.memo(() => {
  const [step, setStep] = useState<Step>(1);

  const steps = useMemo<EuiStepProps[]>(
    () => [
      {
        title: 'Copy rule query',
        status: getStatus(1, step),
        children: <CopyExportQuery onComplete={() => setStep(2)} />,
      },
      {
        title: 'Update your rule export',
        status: getStatus(2, step),
        children: <RulesFileUpload onComplete={() => setStep(3)} />,
      },
    ],
    [setStep, step]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiStepNumber number={1} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <b>{i18n.RULES_DATA_INPUT_TITLE}</b>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <SubStepWrapper>
            <EuiSteps titleSize="xxs" steps={steps} />
          </SubStepWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
RulesDataInput.displayName = 'RulesDataInput';
