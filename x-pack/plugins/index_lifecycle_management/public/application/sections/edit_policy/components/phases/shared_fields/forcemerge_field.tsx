/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { UseField, CheckBoxField, NumericField } from '../../../../../../shared_imports';

import { i18nTexts } from '../../../i18n_texts';

import { useEditPolicyContext } from '../../../edit_policy_context';

import { LearnMoreLink, DescribedFormRow } from '../../';

interface Props {
  phase: 'hot' | 'warm';
}

export const ForcemergeField: React.FunctionComponent<Props> = ({ phase }) => {
  const { policy } = useEditPolicyContext();

  const initialToggleValue = useMemo<boolean>(() => {
    return policy.phases[phase]?.actions?.forcemerge != null;
  }, [policy, phase]);

  return (
    <DescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.enableText"
            defaultMessage="Force merge"
          />
        </h3>
      }
      description={
        <>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.forceMerge.enableExplanationText"
            defaultMessage="Reduce the number of segments in your shard by merging smaller files and clearing deleted ones."
          />{' '}
          <LearnMoreLink docPath="ilm-forcemerge.html" />
        </>
      }
      titleSize="xs"
      fullWidth
      switchProps={{
        label: i18nTexts.editPolicy.forceMergeEnabledFieldLabel,
        'data-test-subj': `${phase}-forceMergeSwitch`,
        initialValue: initialToggleValue,
      }}
    >
      <UseField
        path={`phases.${phase}.actions.forcemerge.max_num_segments`}
        component={NumericField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': `${phase}-selectedForceMergeSegments`,
            min: 1,
          },
        }}
      />
      <UseField
        path={`_meta.${phase}.bestCompression`}
        component={CheckBoxField}
        componentProps={{
          hasEmptyLabelSpace: true,
          euiFieldProps: {
            'data-test-subj': `${phase}-bestCompression`,
          },
        }}
      />
    </DescribedFormRow>
  );
};
