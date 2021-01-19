/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiTextColor } from '@elastic/eui';

import { Phases } from '../../../../../../../common/types';

import { LearnMoreLink, DescribedFormRow } from '../..';
import { i18nTexts } from '../../../i18n_texts';
import { useEditPolicyContext } from '../../../edit_policy_context';
import { StyledFieldNumber } from './styled_field_number';

interface Props {
  phase: 'hot' | 'warm' | ('cold' & keyof Phases);
}

export const IndexPriorityField: FunctionComponent<Props> = ({ phase }) => {
  const { policy } = useEditPolicyContext();

  const initialToggleValue = useMemo<boolean>(() => {
    return policy.phases[phase]?.actions?.set_priority != null;
  }, [policy, phase]);

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
        'aria-label': i18nTexts.editPolicy.indexPriorityFieldLabel,
        'data-test-subj': `${phase}-indexPrioritySwitch`,
        'aria-controls': 'setPriorityContent',
        initialValue: initialToggleValue,
      }}
    >
      <EuiSpacer />
      <div id="indexPriorityContent" aria-live="polite" role="region">
        <StyledFieldNumber
          path={`phases.${phase}.actions.set_priority.priority`}
          fieldNumberProps={{
            'data-test-subj': `${phase}-indexPriority`,
            min: 0,
          }}
        />
      </div>
    </DescribedFormRow>
  );
};
