/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiText, EuiTextColor } from '@elastic/eui';
import React, { FunctionComponent, useCallback } from 'react';

import { get } from 'lodash';
import { NumericField, useFormData } from '../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { UseField, useGlobalFields } from '../../../form';
import { i18nTexts } from '../../../i18n_texts';

import { LearnMoreLink, DescribedFormRow } from '../../';

interface Props {
  phase: 'hot' | 'warm';
}

export const ShrinkField: FunctionComponent<Props> = ({ phase }) => {
  const [formData] = useFormData({
    watch: `_meta.${phase}.useShardCount`,
  });
  const useShardCount = get(formData, `_meta.${phase}.useShardCount`);
  const path = `phases.${phase}.actions.shrink.${
    useShardCount ? 'number_of_shards' : 'max_primary_shard_size'
  }`;
  const { policy } = useEditPolicyContext();
  const globalFields = useGlobalFields();
  const { setValue: setUseShardCount } = globalFields[
    `${phase}UseShardCount` as 'hotUseShardCount'
  ];
  const toggleUseShardCount = useCallback(() => {
    setUseShardCount((prev) => !prev);
  }, [setUseShardCount]);

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
            defaultMessage="Shrink the index to a new index with fewer primary shards."
          />{' '}
          <LearnMoreLink docPath="ilm-shrink.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      switchProps={{
        'data-test-subj': `${phase}-shrinkSwitch`,
        label: i18nTexts.editPolicy.shrinkLabel,
        initialValue: Boolean(policy.phases[phase]?.actions?.shrink),
      }}
      fullWidth
    >
      <UseField
        path={path}
        component={NumericField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': `${phase}-primaryShard${useShardCount ? 'Count' : 'Size'}`,
            min: 1,
          },
          labelAppend: (
            <EuiText size="xs">
              <EuiLink onClick={toggleUseShardCount} data-test-subj="toggleUseShardCount">
                <FormattedMessage
                  id="xpack.ingestPipelines.pipelineEditor.useCopyFromLabel"
                  defaultMessage={`Configure shard ${useShardCount ? 'size' : 'count'}`}
                />
              </EuiLink>
            </EuiText>
          ),
        }}
      />
    </DescribedFormRow>
  );
};
