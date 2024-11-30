/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStepNumber,
  EuiSteps,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';

export const RulesDataInput = React.memo(() => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const steps = useMemo(
    () => [
      {
        title: 'Copy rule query',
        children: <CopyQueryStep onComplete={() => setStep(2)} />,
      },
    ],
    [setStep]
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
                <b>
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.title"
                    defaultMessage="Upload rule export and check for macros and lookups"
                  />
                </b>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSteps titleSize="xxs" steps={steps} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
RulesDataInput.displayName = 'RulesDataInput';

interface StepProps {
  onComplete: () => void;
}
const CopyQueryStep = React.memo<StepProps>(({ onComplete }) => {
  return <p>{'Do this first'}</p>;
});
CopyQueryStep.displayName = 'CopyQueryStep';
