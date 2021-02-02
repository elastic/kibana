/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTextColor } from '@elastic/eui';

import { UseField, NumericField } from '../../../../../../shared_imports';
import { LearnMoreLink, DescribedFormRow } from '../..';
import { useEditPolicyContext } from '../../../edit_policy_context';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
}

export const IndexPriorityField: FunctionComponent<Props> = ({ phase }) => {
  const { policy, isNewPolicy } = useEditPolicyContext();

  const initialToggleValue = useMemo<boolean>(() => {
    return (
      isNewPolicy || // enable index priority for new policies
      !policy.phases[phase]?.actions || // enable index priority for new phases
      policy.phases[phase]?.actions?.set_priority != null // enable index priority if it's set
    );
  }, [isNewPolicy, policy.phases, phase]);

  return (
    <DescribedFormRow
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
          <LearnMoreLink docPath="ilm-set-priority.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      fullWidth
      switchProps={{
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.indexPriority.indexPriorityEnabledFieldLabel',
          {
            defaultMessage: 'Set index priority',
          }
        ),
        'data-test-subj': `${phase}-indexPrioritySwitch`,
        initialValue: initialToggleValue,
      }}
    >
      <EuiSpacer />
      <UseField
        path={`phases.${phase}.actions.set_priority.priority`}
        component={NumericField}
        euiFieldProps={{
          fullWidth: false,
          'data-test-subj': `${phase}-indexPriority`,
          min: 0,
        }}
      />
    </DescribedFormRow>
  );
};
