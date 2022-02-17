/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import uuid from 'uuid';
import { EuiCheckbox, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { NumericField, useKibana } from '../../../../../../shared_imports';
import { i18nTexts } from '../../../i18n_texts';

import { useEditPolicyContext } from '../../../edit_policy_context';

import { UseField } from '../../../form';

import { LearnMoreLink, DescribedFormRow } from '../../';

interface Props {
  phase: 'hot' | 'warm';
}

export const ForcemergeField: React.FunctionComponent<Props> = ({ phase }) => {
  const { policy } = useEditPolicyContext();

  const initialToggleValue = useMemo<boolean>(() => {
    return policy.phases[phase]?.actions?.forcemerge != null;
  }, [policy, phase]);

  const { docLinks } = useKibana().services;

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
            defaultMessage="Reduce the number of segments in each index shard and clean up deleted documents."
          />{' '}
          <LearnMoreLink docPath={docLinks.links.elasticsearch.ilmForceMerge} />
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
      <EuiSpacer />
      <UseField path={`_meta.${phase}.bestCompression`}>
        {(field) => (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                label={field.label}
                checked={field.value as boolean}
                onChange={field.onChange}
                data-test-subj={`${phase}-bestCompression`}
                id={uuid()}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18nTexts.editPolicy.bestCompressionFieldHelpText}
                position="right"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </UseField>
    </DescribedFormRow>
  );
};
