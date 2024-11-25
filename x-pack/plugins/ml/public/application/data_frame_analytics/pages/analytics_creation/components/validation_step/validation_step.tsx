/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';

import type { CalloutMessage } from '@kbn/ml-validators';

import { Callout } from '../../../../../components/callout';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';

interface Props {
  setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
  checksInProgress: boolean;
  validationMessages: CalloutMessage[];
}

export const ValidationStep: FC<Props> = ({
  checksInProgress,
  validationMessages,
  setCurrentStep,
}) => {
  const callouts = validationMessages.map((m, i) => <Callout key={`${m.id}_${i}`} {...m} />);

  return (
    <>
      {checksInProgress && <EuiLoadingSpinner size="xl" />}
      {!checksInProgress && (
        <>
          {callouts}
          <EuiSpacer />
          <ContinueButton
            isDisabled={false}
            onClick={() => {
              setCurrentStep(ANALYTICS_STEPS.CREATE);
            }}
          />
        </>
      )}
    </>
  );
};
