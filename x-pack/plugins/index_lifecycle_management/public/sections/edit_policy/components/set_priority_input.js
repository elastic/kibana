/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { LearnMoreLink, OptionalLabel } from '../../components';
import {
  EuiFieldNumber,
  EuiTextColor,
  EuiDescribedFormGroup
} from '@elastic/eui';
import {
  PHASE_INDEX_PRIORITY,
} from '../../../store/constants';
import { ErrableFormRow } from '../form_errors';
import { FormattedMessage } from '@kbn/i18n/react';
export const SetPriorityInput = props => {
  const { errors, phaseData, phase, setPhaseData, isShowingErrors } = props;

  return (
    <EuiDescribedFormGroup
      title={
        <p>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.indexPriorityText"
            defaultMessage="Index priority"
          />
        </p>
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
        id={`${phase}-${PHASE_INDEX_PRIORITY}`}
        label={
          <Fragment>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexPriorityLabel"
              defaultMessage="Index priority"
            />
            <OptionalLabel />
          </Fragment>
        }
        errorKey={PHASE_INDEX_PRIORITY}
        isShowingErrors={isShowingErrors}
        errors={errors}
      >
        <EuiFieldNumber
          id={`${phase}-${PHASE_INDEX_PRIORITY}`}
          value={phaseData[PHASE_INDEX_PRIORITY]}
          onChange={e => {
            setPhaseData(PHASE_INDEX_PRIORITY, e.target.value);
          }}
          min={0}
        />
      </ErrableFormRow>
    </EuiDescribedFormGroup>
  );
};
