/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import * as RuleI18n from '../../../pages/detection_engine/rules/translations';

interface NextStepProps {
  onClick: () => Promise<void>;
  isDisabled: boolean;
  dataTestSubj?: string;
}

export const NextStep = React.memo<NextStepProps>(
  ({ onClick, isDisabled, dataTestSubj = 'nextStep-continue' }) => (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onClick} isDisabled={isDisabled} data-test-subj={dataTestSubj}>
            {RuleI18n.CONTINUE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  )
);

NextStep.displayName = 'NextStep';
