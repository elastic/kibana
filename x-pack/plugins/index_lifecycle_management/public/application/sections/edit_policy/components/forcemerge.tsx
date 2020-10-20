/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * PLEASE NOTE: This component is currently duplicated. A version of this component wired up with
 * the form lib lives in ./phases/shared
 */

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LearnMoreLink } from './learn_more_link';
import { ErrableFormRow } from './form_errors';
import { Phases, PhaseWithForcemergeAction } from '../../../../../common/types';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';

const forcemergeLabel = i18n.translate('xpack.indexLifecycleMgmt.forcemerge.enableLabel', {
  defaultMessage: 'Force merge data',
});

const bestCompressionLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.forcemerge.bestCompressionLabel',
  {
    defaultMessage: 'Compress stored fields',
  }
);

interface Props {
  errors?: PhaseValidationErrors<PhaseWithForcemergeAction>;
  phase: keyof Phases & string;
  phaseData: PhaseWithForcemergeAction;
  setPhaseData: (dataKey: keyof PhaseWithForcemergeAction, value: boolean | string) => void;
  isShowingErrors: boolean;
}

export const Forcemerge: React.FunctionComponent<Props> = ({
  errors,
  phaseData,
  phase,
  setPhaseData,
  isShowingErrors,
}) => {
  return (
    <EuiDescribedFormGroup
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.enableText"
            defaultMessage="Force merge"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.enableExplanationText"
            defaultMessage="Reduce the number of segments in your shard by merging smaller files and clearing deleted ones."
          />{' '}
          <LearnMoreLink docPath="indices-forcemerge.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      fullWidth
    >
      <EuiSwitch
        data-test-subj={`${phase}-forceMergeSwitch`}
        label={forcemergeLabel}
        aria-label={forcemergeLabel}
        checked={phaseData.forceMergeEnabled}
        onChange={(e) => {
          setPhaseData('forceMergeEnabled', e.target.checked);
        }}
        aria-controls="forcemergeContent"
      />

      <EuiSpacer />
      <div id="forcemergeContent" aria-live="polite" role="region">
        {phaseData.forceMergeEnabled ? (
          <>
            <ErrableFormRow
              id={`${phase}-selectedForceMergeSegments`}
              label={i18n.translate('xpack.indexLifecycleMgmt.forceMerge.numberOfSegmentsLabel', {
                defaultMessage: 'Number of segments',
              })}
              isShowingErrors={isShowingErrors}
              errors={errors?.selectedForceMergeSegments}
            >
              <EuiFieldNumber
                data-test-subj={`${phase}-selectedForceMergeSegments`}
                value={phaseData.selectedForceMergeSegments}
                onChange={(e) => {
                  setPhaseData('selectedForceMergeSegments', e.target.value);
                }}
                min={1}
              />
            </ErrableFormRow>
            <EuiFormRow
              hasEmptyLabelSpace
              helpText={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.bestCompressionText"
                  defaultMessage="Use higher compression for stored fields at the cost of slower performance."
                />
              }
            >
              <EuiSwitch
                data-test-subj={`${phase}-bestCompression`}
                label={bestCompressionLabel}
                checked={phaseData.bestCompressionEnabled}
                onChange={(e) => {
                  setPhaseData('bestCompressionEnabled', e.target.checked);
                }}
              />
            </EuiFormRow>
          </>
        ) : null}
      </div>
    </EuiDescribedFormGroup>
  );
};
