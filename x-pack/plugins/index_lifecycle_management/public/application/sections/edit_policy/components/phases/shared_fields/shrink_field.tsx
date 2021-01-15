/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTextColor } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { i18nTexts } from '../../../i18n_texts';

import { LearnMoreLink, DescribedFormRow } from '../../';
import { StyledFieldNumber } from './styled_field_number';

interface Props {
  phase: 'hot' | 'warm';
}

export const ShrinkField: FunctionComponent<Props> = ({ phase }) => {
  const path = `phases.${phase}.actions.shrink.number_of_shards`;
  const { policy } = useEditPolicyContext();
  return (
    <DescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.shrinkText"
            defaultMessage="Shrink"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.shrinkIndexExplanationText"
            defaultMessage="Shrink the index into a new index with fewer primary shards."
          />{' '}
          <LearnMoreLink docPath="ilm-shrink.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      switchProps={{
        'aria-controls': 'shrinkContent',
        'data-test-subj': `${phase}-shrinkSwitch`,
        'aria-label': i18nTexts.editPolicy.shrinkLabel,
        initialValue: Boolean(policy.phases[phase]?.actions?.shrink),
      }}
      fullWidth
    >
      <div id="shrinkContent" aria-live="polite" role="region">
        <EuiFlexGroup>
          <EuiFlexItem>
            <StyledFieldNumber
              path={path}
              fieldNumberProps={{
                'data-test-subj': `${phase}-primaryShardCount`,
                min: 1,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </div>
    </DescribedFormRow>
  );
};
