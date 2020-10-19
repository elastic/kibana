/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTextColor, EuiDescribedFormGroup } from '@elastic/eui';

import { PhaseWithIndexPriority, Phases } from '../../../../../../../common/types';

import { UseField, NumericField } from '../../../../../../shared_imports';

import { propertyof } from '../../../../../services/policies/policy_validation';

import { LearnMoreLink } from '../../';

interface Props {
  phase: keyof Phases & string;
}

export const SetPriorityInput: FunctionComponent<Props> = ({ phase }) => {
  const phaseIndexPriorityProperty = propertyof<PhaseWithIndexPriority>('phaseIndexPriority');
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
      <UseField
        key={`phases.${phase}.actions.set_priority.priority`}
        path={`phases.${phase}.actions.set_priority.priority`}
        component={NumericField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': `${phase}-${phaseIndexPriorityProperty}`,
            min: 1,
          },
        }}
      />
    </EuiDescribedFormGroup>
  );
};
