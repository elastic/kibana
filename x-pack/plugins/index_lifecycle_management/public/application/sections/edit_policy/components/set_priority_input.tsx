/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFieldNumber, EuiTextColor, EuiDescribedFormGroup } from '@elastic/eui';

import { LearnMoreLink } from './';
import { OptionalLabel } from './';
import { ErrableFormRow } from './';
import { PhaseWithIndexPriority, Phases } from '../../../services/policies/types';
import { PhaseValidationErrors, propertyof } from '../../../services/policies/policy_validation';

interface Props<T extends PhaseWithIndexPriority> {
  errors?: PhaseValidationErrors<T>;
  phase: keyof Phases & string;
  phaseData: T;
  setPhaseData: (dataKey: keyof T & string, value: any) => void;
  isShowingErrors: boolean;
}
export const SetPriorityInput = <T extends PhaseWithIndexPriority>({
  errors,
  phaseData,
  phase,
  setPhaseData,
  isShowingErrors,
}: React.PropsWithChildren<Props<T>>) => {
  const phaseIndexPriorityProperty = propertyof<T>('phaseIndexPriority');
  return (
    <EuiDescribedFormGroup
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.indexPriorityText"
            defaultMessage="Index priority"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.indexPriorityExplanationText"
            defaultMessage="Set the priority for recovering your indices after a node restart.
              Indices with higher priorities are recovered before indices with lower priorities."
          />{' '}
          <LearnMoreLink docPath="recovery-prioritization.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      fullWidth
    >
      <ErrableFormRow
        id={`${phase}-${phaseIndexPriorityProperty}`}
        label={
          <Fragment>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexPriorityLabel"
              defaultMessage="Index priority"
            />
            <OptionalLabel />
          </Fragment>
        }
        isShowingErrors={isShowingErrors}
        errors={errors?.phaseIndexPriority}
      >
        <EuiFieldNumber
          id={`${phase}-${phaseIndexPriorityProperty}`}
          value={phaseData.phaseIndexPriority}
          onChange={(e) => {
            setPhaseData(phaseIndexPriorityProperty, e.target.value);
          }}
          min={0}
        />
      </ErrableFormRow>
    </EuiDescribedFormGroup>
  );
};
