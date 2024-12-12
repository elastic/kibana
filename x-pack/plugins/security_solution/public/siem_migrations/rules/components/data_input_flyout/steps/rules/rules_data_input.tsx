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
import type { OnMigrationCreated } from '../../types';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useRulesFileUploadStep } from './sub_steps/rules_file_upload';
import * as i18n from './translations';
import { useCheckResourcesStep } from './sub_steps/check_resources';

type Step = 1 | 2 | 3 | 4;
const getStatus = (step: Step, currentStep: Step): EuiStepStatus => {
  if (step === currentStep) {
    return 'current';
  }
  if (step < currentStep) {
    return 'complete';
  }
  return 'incomplete';
};

interface RulesDataInputProps {
  selected: boolean;
  onMigrationCreated: OnMigrationCreated;
}

export const RulesDataInput = React.memo<RulesDataInputProps>(
  ({ selected, onMigrationCreated }) => {
    const [step, setStep] = useState<Step>(1);

    const copyStep = useCopyExportQueryStep({
      status: getStatus(1, step),
      onCopied: () => setStep(2),
    });

    const uploadStep = useRulesFileUploadStep({
      status: getStatus(2, step),
      onMigrationCreated: (stats) => {
        onMigrationCreated(stats);
        setStep(3);
      },
    });

    const resourcesStep = useCheckResourcesStep({
      status: getStatus(3, step),
      onComplete: () => {
        setStep(4);
      },
    });

    const steps = useMemo<EuiStepProps[]>(
      () => [copyStep, uploadStep, resourcesStep],
      [copyStep, uploadStep, resourcesStep]
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
  }
);
RulesDataInput.displayName = 'RulesDataInput';
